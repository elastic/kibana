/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import type {
  CreateFromJsonResult,
  SanitizeImportJson,
} from '@kbn/as-code-import-flyout-component';
import { ImportJsonValidationError } from '@kbn/as-code-import-flyout-component';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { DashboardApi } from '../dashboard_api/types';
import { embeddableService } from '../services/kibana_services';
import { panelJsonStrings } from './_panel_json_strings';
import { markMissingDataViews } from '../utils/mark_missing_data_views';
import { normalizeImportedPanels } from './normalize_imported_panels';
import { sanitizePanels } from './sanitize_panels';
import type { ImportedPanels, PanelJsonEntry } from './types';

/** Returns the panel title, or an empty string when the panel has none. */
export const getPanelTitle = ({ config }: PanelJsonEntry): string =>
  (config as SerializedTitles).title ?? '';

const assertPanelTypesAreAvailable = async (panels: PanelJsonEntry[]) => {
  const definitions = await Promise.all(
    panels.map(({ type }) => embeddableService.getEmbeddableDefinition(type).catch(() => undefined))
  );
  const unavailableIndex = definitions.findIndex((definition) => !definition);
  if (unavailableIndex !== -1) {
    throw new ImportJsonValidationError(
      panelJsonStrings.getPanelTypeNotAvailableError(panels[unavailableIndex].type)
    );
  }
};

/**
 * Validates pasted or uploaded panel JSON for this dashboard and marks the data views it uses
 * that don't exist in the current space.
 */
export const sanitizeImportedPanels: SanitizeImportJson<ImportedPanels> = async (raw, signal) => {
  const entries = normalizeImportedPanels(raw);
  await assertPanelTypesAreAvailable(entries);

  const { panels, warnings, relatedItems, relatedItemsCount } = await sanitizePanels(
    entries,
    signal
  );
  const sanitizedPanels = panels.filter((panel): panel is PanelJsonEntry => panel !== undefined);
  // When only some panels are dropped, the others are still added and the warnings list the dropped ones
  if (sanitizedPanels.length === 0) {
    const droppedPanelWarning = warnings.find(({ type }) => type === 'dropped_panel');
    throw new ImportJsonValidationError(
      panelJsonStrings.getPanelNotSupportedError(droppedPanelWarning?.message)
    );
  }

  return {
    data: { panels: sanitizedPanels },
    warnings: warnings.map(({ message }) => message),
    relatedItems: await markMissingDataViews(relatedItems),
    relatedItemsCount,
  };
};

/**
 * Adds the imported panels to the dashboard at their original size, each in the first open space,
 * like Copy to dashboard. Panels are placed in reading order of their exported positions.
 */
export const addImportedPanels = (
  dashboardApi: Pick<DashboardApi, 'addIncomingEmbeddables'>,
  { panels }: ImportedPanels
): CreateFromJsonResult => {
  const orderedPanels = [...panels].sort(
    ({ grid: first }, { grid: second }) => first.y - second.y || first.x - second.x
  );
  const panelIds = orderedPanels.map(() => v4());
  const packages: EmbeddablePackageState[] = orderedPanels.map(({ type, grid, config }, index) => ({
    embeddableId: panelIds[index],
    type,
    serializedState: config,
    size: { width: grid.w, height: grid.h },
  }));
  dashboardApi.addIncomingEmbeddables(packages);
  return { id: panelIds[0], title: getPanelTitle(orderedPanels[0]) };
};
