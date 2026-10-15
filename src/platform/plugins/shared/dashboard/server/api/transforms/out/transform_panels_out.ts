/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, groupBy } from 'lodash';

import type { SavedObjectReference } from '@kbn/core/server';
import type { PanelTypeMigrationResult } from '@kbn/embeddable-plugin/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { ZodError } from '@kbn/zod';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type {
  DashboardPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/as-code-dashboard-schema';
import type { SavedDashboardPanel, SavedDashboardSection } from '../../../dashboard_saved_object';
import { embeddableService, logger } from '../../../kibana_services';
import type { Warnings } from '../../types';
import { getPanelReferences } from './get_panel_references';
import { panelBwc } from './panel_bwc';

interface TransformedPanel {
  panel: DashboardPanel;
  sectionId?: string;
  storedConfig: SavedDashboardPanel['embeddableConfig'];
  panelReferences: SavedObjectReference[];
  migratedFrom?: string;
}

export function transformPanelsOut(
  panelsJSON: string = '[]',
  sections: SavedDashboardSection[] = [],
  containerReferences: SavedObjectReference[] = [],
  isDashboardAppRequest: boolean = false,
  migratePanelTypes: boolean = false
): { panels: DashboardState['panels']; warnings: Warnings } {
  const topLevelPanels: DashboardPanel[] = [];
  const warnings: Warnings = [];
  const sectionsMap: { [uuid: string]: DashboardSection } = {};
  sections.forEach((section) => {
    const { gridData: grid, ...restOfSection } = section;
    const { i: sectionId, ...restOfGrid } = grid;
    sectionsMap[sectionId] = {
      ...restOfSection,
      collapsed: restOfSection.collapsed ?? false,
      grid: restOfGrid,
      panels: [],
      id: sectionId,
    };
  });

  let parsedPanels: SavedDashboardPanel[];
  try {
    parsedPanels = JSON.parse(panelsJSON);
  } catch (parseError) {
    logger.warn(`Unable to parse panelsJSON. Error: ${parseError.message}`);
    return { panels: [], warnings };
  }

  const transformedPanels: TransformedPanel[] = [];
  parsedPanels.forEach((storedPanel) => {
    const storedPanelReferences = getPanelReferences(containerReferences ?? [], storedPanel);
    const { sectionId } = storedPanel.gridData;
    const { panel, panelReferences } = panelBwc(storedPanel, storedPanelReferences ?? []);
    try {
      transformedPanels.push({
        panel: transformPanelWithoutValidation(
          panel,
          panelReferences,
          containerReferences,
          isDashboardAppRequest
        ),
        sectionId,
        storedConfig: panel.embeddableConfig,
        panelReferences,
      });
    } catch (err) {
      warnings.push({
        type: 'dropped_panel',
        panel_type: panel.type,
        panel_config: panel.embeddableConfig,
        panel_references: panelReferences,
        message: `Unable to transform panel config. Error: ${getErrorMessage(err)}`,
      });
    }
  });

  const migratedPanels = migratePanelTypes
    ? applyPanelTypeMigrations(transformedPanels, warnings)
    : transformedPanels;

  migratedPanels.forEach(({ panel, sectionId, storedConfig, panelReferences, migratedFrom }) => {
    let panelProperties: DashboardPanel;
    try {
      panelProperties = {
        ...panel,
        config: validatePanelConfig(panel, isDashboardAppRequest, migratedFrom),
      };
    } catch (err) {
      warnings.push({
        type: 'dropped_panel',
        panel_type: panel.type,
        panel_config: storedConfig,
        panel_references: panelReferences,
        message: `Unable to transform panel config. Error: ${getErrorMessage(err)}`,
      });
      return;
    }

    if (sectionId) {
      if (!sectionsMap[sectionId]) {
        warnings.push({
          type: 'dropped_panel',
          panel_type: panelProperties.type,
          panel_config: panelProperties.config,
          message: `Panel references non-existent section '${sectionId}'`,
        });
        return;
      }
      sectionsMap[sectionId].panels.push(panelProperties);
    } else {
      topLevelPanels.push(panelProperties);
    }
  });

  return {
    panels: [...topLevelPanels, ...Object.values(sectionsMap)],
    warnings,
  };
}

const defaultTransform = (
  config: SavedDashboardPanel['embeddableConfig']
): SavedDashboardPanel['embeddableConfig'] => {
  const transformsFlow = flow(transformTitlesOut, transformTimeRangeOut);
  return transformsFlow(config);
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof ZodError) {
    return stringifyZodError(err);
  }
  return err instanceof Error ? err.message : String(err);
};

// Temporary escape hatch for lens as code
// TODO remove when lens as code transforms are ready for production
const getTransforms = (type: string, isDashboardAppRequest: boolean) =>
  embeddableService?.getTransforms(
    type === LENS_EMBEDDABLE_TYPE && isDashboardAppRequest ? 'lens-dashboard-app' : type
  );

function transformPanelWithoutValidation(
  panel: SavedDashboardPanel,
  panelReferences: SavedObjectReference[],
  containerReferences: SavedObjectReference[] = [],
  isDashboardAppRequest: boolean = false
): DashboardPanel {
  const { embeddableConfig, gridData, panelIndex, type } = panel;

  const { sectionId, i, ...restOfGrid } = gridData;

  const transforms = getTransforms(type, isDashboardAppRequest);
  const transformedPanelConfig =
    transforms?.transformOut?.(embeddableConfig, panelReferences, containerReferences, undefined) ??
    defaultTransform(embeddableConfig);

  return {
    grid: restOfGrid,
    config: transformedPanelConfig,
    id: panelIndex,
    type,
  };
}

function validatePanelConfig(
  { type, config }: DashboardPanel,
  isDashboardAppRequest: boolean,
  migratedFrom?: string
): DashboardPanel['config'] {
  const schema = getTransforms(type, isDashboardAppRequest)?.schema;
  if (schema) {
    return schema.parse(config);
  }
  if (migratedFrom) {
    throw new Error(`Panel type "${type}" migrated from "${migratedFrom}" has no schema`);
  }
  return config;
}

/**
 * Passes each group of same-typed panels to the panel type migration registered for that type.
 * Panels a migration does not return are unchanged; panels it fails to migrate are dropped.
 */
function applyPanelTypeMigrations(
  transformedPanels: TransformedPanel[],
  warnings: Warnings
): TransformedPanel[] {
  const results = new Map<TransformedPanel, PanelTypeMigrationResult>();

  Object.entries(groupBy(transformedPanels, ({ panel }) => panel.type)).forEach(([type, group]) => {
    const migration = embeddableService?.getPanelTypeMigration(type);
    if (!migration) return;

    let groupResults: readonly PanelTypeMigrationResult[];
    try {
      groupResults = migration.migrateOut(
        group.map(({ panel }) => ({ id: panel.id ?? '', config: panel.config }))
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      groupResults = group.map(({ panel }) => ({ panelId: panel.id ?? '', error }));
    }

    group.forEach((transformedPanel) => {
      const result = groupResults.find(({ panelId }) => panelId === transformedPanel.panel.id);
      if (result) results.set(transformedPanel, result);
    });
  });

  return transformedPanels.flatMap((transformedPanel) => {
    const result = results.get(transformedPanel);
    if (!result) return [transformedPanel];

    const { panel, storedConfig, panelReferences } = transformedPanel;
    if ('error' in result) {
      warnings.push({
        type: 'dropped_panel',
        panel_type: panel.type,
        panel_config: storedConfig,
        panel_references: panelReferences,
        message: `Unable to migrate panel type. Error: ${getErrorMessage(result.error)}`,
      });
      return [];
    }

    return [
      {
        ...transformedPanel,
        panel: { ...panel, type: result.type, config: result.config },
        migratedFrom: panel.type,
      },
    ];
  });
}
