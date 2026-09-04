/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import type { SavedObjectReference } from '@kbn/core/server';
import type { PanelTypeMigrationResult } from '@kbn/embeddable-plugin/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { ZodError } from '@kbn/zod';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type { SavedDashboardPanel, SavedDashboardSection } from '../../../dashboard_saved_object';
import { embeddableService, logger } from '../../../kibana_services';
import type { DashboardPanel, DashboardSection, DashboardState, Warnings } from '../../types';
import { getPanelReferences } from './get_panel_references';
import { panelBwc } from './panel_bwc';

interface WorkingPanel {
  readonly sectionId?: string;
  readonly references: SavedObjectReference[];
  panel: DashboardPanel & { id: string };
  migratedFrom?: string;
  dropped?: boolean;
}

export function transformPanelsOut(
  panelsJSON: string = '[]',
  sections: SavedDashboardSection[] = [],
  containerReferences: SavedObjectReference[] = [],
  isDashboardAppRequest: boolean = false,
  migratePanelTypes: boolean = false
): { panels: DashboardState['panels']; warnings: Warnings } {
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

  const workingPanels: WorkingPanel[] = [];

  for (const storedPanel of parsedPanels) {
    const storedPanelReferences = getPanelReferences(containerReferences ?? [], storedPanel);
    const { sectionId } = storedPanel.gridData;
    const { panel, panelReferences } = panelBwc(storedPanel, storedPanelReferences ?? []);

    try {
      const panelOut = transformPanelWithoutValidation(
        panel,
        panelReferences,
        containerReferences,
        isDashboardAppRequest
      );

      workingPanels.push({
        sectionId,
        references: panelReferences,
        panel: panelOut,
      });
    } catch (err) {
      warnings.push({
        type: 'dropped_panel',
        panel_type: panel.type,
        panel_config: panel.embeddableConfig,
        panel_references: panelReferences,
        message: `Unable to transform panel config. Error: ${formatTransformError(err)}`,
      });
    }
  }

  if (migratePanelTypes) {
    // Order: source transformOut -> batch type migration -> final-type schema validation.
    // Any per-panel failures fall back to dropped_panel warnings.
    applyPanelTypeMigrations(workingPanels, warnings);
  }

  const topLevelPanels: DashboardPanel[] = [];

  for (const working of workingPanels) {
    if (working.dropped) continue;

    const { panel, sectionId, references, migratedFrom } = working;

    const schemaErrorOrConfig = validatePanelConfig(panel, isDashboardAppRequest, migratedFrom);

    if (schemaErrorOrConfig instanceof Error) {
      warnings.push({
        type: 'dropped_panel',
        panel_type: panel.type,
        panel_config: panel.config,
        panel_references: references,
        message: `Unable to transform panel config. Error: ${formatTransformError(
          schemaErrorOrConfig
        )}`,
      });
      continue;
    }

    const validatedPanel: DashboardPanel = {
      ...panel,
      config: schemaErrorOrConfig,
    };

    if (sectionId) {
      if (!sectionsMap[sectionId]) {
        warnings.push({
          type: 'dropped_panel',
          panel_type: validatedPanel.type,
          panel_config: validatedPanel.config,
          message: `Panel references non-existent section '${sectionId}'`,
        });
        continue;
      }
      sectionsMap[sectionId].panels.push(validatedPanel);
    } else {
      topLevelPanels.push(validatedPanel);
    }
  }

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

function getTransformLookupType(type: string, isDashboardAppRequest: boolean) {
  // Temporary escape hatch for lens as code
  // TODO remove when lens as code transforms are ready for production
  return type === LENS_EMBEDDABLE_TYPE && isDashboardAppRequest ? 'lens-dashboard-app' : type;
}

function formatTransformError(err: unknown) {
  if (err instanceof ZodError) {
    return stringifyZodError(err);
  }
  return err instanceof Error ? err.message : String(err);
}

function transformPanelWithoutValidation(
  panel: SavedDashboardPanel,
  panelReferences: SavedObjectReference[],
  containerReferences: SavedObjectReference[] = [],
  isDashboardAppRequest: boolean = false
): DashboardPanel & { id: string } {
  const { embeddableConfig, gridData, panelIndex, type } = panel;
  const { i, sectionId, ...restOfGrid } = gridData;

  const transforms = embeddableService?.getTransforms(
    getTransformLookupType(type, isDashboardAppRequest)
  );
  const transformedPanelConfig =
    transforms?.transformOut?.(embeddableConfig, panelReferences, containerReferences, undefined) ??
    defaultTransform(embeddableConfig);

  return {
    grid: restOfGrid,
    config: transformedPanelConfig as Record<string, unknown>,
    id: panelIndex,
    type,
  };
}

function validatePanelConfig(
  panel: DashboardPanel,
  isDashboardAppRequest: boolean,
  migratedFrom?: string
): Record<string, unknown> | Error {
  const transforms = embeddableService?.getTransforms(
    getTransformLookupType(panel.type, isDashboardAppRequest)
  );
  const schema = transforms?.schema;

  if (!schema) {
    if (migratedFrom) {
      return new Error(
        `Panel schema not available for migrated panel type: ${panel.type} (from: ${migratedFrom})`
      );
    }
    return panel.config as Record<string, unknown>;
  }

  try {
    return schema.parse(panel.config) as Record<string, unknown>;
  } catch (e) {
    return e as Error;
  }
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function applyPanelTypeMigrations(panels: WorkingPanel[], warnings: Warnings) {
  const panelsBySource = new Map<string, WorkingPanel[]>();
  for (const working of panels) {
    const group = panelsBySource.get(working.panel.type) ?? [];
    group.push(working);
    panelsBySource.set(working.panel.type, group);
  }

  for (const [sourceType, sourcePanels] of panelsBySource.entries()) {
    const migrations = embeddableService?.getPanelTypeMigrations(sourceType) ?? [];
    if (migrations.length === 0) continue;

    const panelIds = new Set(sourcePanels.map(({ panel }) => panel.id));
    const inputPanels = sourcePanels.map(({ panel }) => ({
      id: panel.id,
      config: panel.config,
    }));

    const errorsByPanelId = new Map<string, Error>();
    const successesByPanelId = new Map<
      string,
      Array<{ to: string; config: Record<string, unknown> }>
    >();

    for (const migration of migrations) {
      let results: readonly PanelTypeMigrationResult[];
      try {
        results = migration.migrateOut(inputPanels);
      } catch (e) {
        const err = toError(e);
        results = inputPanels.map(({ id }) => ({ panelId: id, error: err }));
      }

      for (const result of results) {
        const panelId = result.panelId;
        if (!panelIds.has(panelId)) continue;

        if ('error' in result) {
          errorsByPanelId.set(panelId, result.error);
          continue;
        }

        const existing = successesByPanelId.get(panelId) ?? [];
        existing.push({ to: migration.to, config: result.config });
        successesByPanelId.set(panelId, existing);
      }
    }

    for (const working of sourcePanels) {
      const panelId = working.panel.id;
      const error = errorsByPanelId.get(panelId);
      if (error) {
        warnings.push({
          type: 'dropped_panel',
          panel_type: sourceType,
          panel_config: working.panel.config,
          panel_references: working.references,
          message: `Unable to migrate panel type. Error: ${formatTransformError(error)}`,
        });
        working.dropped = true;
        continue;
      }

      const successes = successesByPanelId.get(panelId) ?? [];
      if (successes.length > 1) {
        warnings.push({
          type: 'dropped_panel',
          panel_type: sourceType,
          panel_config: working.panel.config,
          panel_references: working.references,
          message: `Multiple panel type migrations claimed this panel: ${successes
            .map((s) => s.to)
            .join(', ')}`,
        });
        working.dropped = true;
        continue;
      }

      const success = successes[0];
      if (!success) continue;

      working.migratedFrom = sourceType;
      working.panel = { ...working.panel, type: success.to, config: success.config };
    }
  }
}
