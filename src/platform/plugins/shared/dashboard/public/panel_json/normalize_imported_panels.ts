/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { clamp } from 'lodash';
import type { GridData } from '@kbn/as-code-dashboard-schema';
import { ImportJsonValidationError } from '@kbn/as-code-import-flyout-component';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../common/constants';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../common/page_bundle_constants';
import { panelJsonStrings } from './_panel_json_strings';
import type { PanelJsonEntry } from './types';

/** How many panels can be added from one JSON input. */
export const MAX_IMPORTED_PANELS = 1;

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isSection = (item: unknown): item is JsonObject & { panels: unknown[] } =>
  isJsonObject(item) && Array.isArray(item.panels) && !('config' in item);

/**
 * A panel entry, an array of entries, or anything with a `panels` array, such as a dashboard
 * export. Panels inside sections are included.
 */
const getPanelCandidates = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (isJsonObject(raw) && Array.isArray(raw.panels)) {
    return raw.panels.flatMap((item) => (isSection(item) ? item.panels : [item]));
  }
  return [raw];
};

const toGridData = (grid: unknown): GridData => {
  const { x, y, w, h } = isJsonObject(grid) ? grid : ({} as JsonObject);
  const width = isFiniteNumber(w)
    ? clamp(Math.round(w), 1, DASHBOARD_GRID_COLUMN_COUNT)
    : DEFAULT_PANEL_WIDTH;
  return {
    x: isFiniteNumber(x) ? clamp(Math.round(x), 0, DASHBOARD_GRID_COLUMN_COUNT - width) : 0,
    y: isFiniteNumber(y) ? Math.max(Math.round(y), 0) : 0,
    w: width,
    h: isFiniteNumber(h) ? Math.max(Math.round(h), 1) : DEFAULT_PANEL_HEIGHT,
  };
};

const toPanelJsonEntry = (candidate: unknown): PanelJsonEntry => {
  if (
    !isJsonObject(candidate) ||
    typeof candidate.type !== 'string' ||
    !isJsonObject(candidate.config)
  ) {
    throw new ImportJsonValidationError(panelJsonStrings.getNotAPanelError());
  }
  return { type: candidate.type, grid: toGridData(candidate.grid), config: candidate.config };
};

/**
 * Moves panels up so the top one starts at the first row. Panels keep their arrangement, whether
 * they come from a panel export or from a whole dashboard.
 */
export const alignPanelsToTop = (panels: PanelJsonEntry[]): PanelJsonEntry[] => {
  const top = Math.min(...panels.map(({ grid }) => grid.y));
  return panels.map((panel) => ({ ...panel, grid: { ...panel.grid, y: panel.grid.y - top } }));
};

/** Reads untrusted JSON into panel entries, or throws an error that explains what is wrong. */
export const normalizeImportedPanels = (raw: unknown): PanelJsonEntry[] => {
  const candidates = getPanelCandidates(raw);
  if (candidates.length === 0) {
    throw new ImportJsonValidationError(panelJsonStrings.getNoPanelsError());
  }
  if (candidates.length > MAX_IMPORTED_PANELS) {
    throw new ImportJsonValidationError(panelJsonStrings.getTooManyPanelsError(candidates.length));
  }
  return alignPanelsToTop(candidates.map(toPanelJsonEntry));
};
