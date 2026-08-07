/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import isPlainObject from 'lodash/isPlainObject';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import type { VisualizeByValueState } from '@kbn/visualizations-plugin/common';
import {
  isVisualizeByReferenceState,
  isVisualizeByValueState,
} from '@kbn/visualizations-plugin/common';
import type {
  PanelTypeMigrationErrorResult,
  PanelTypeMigrationPanel,
  PanelTypeMigrationResult,
  PanelTypeMigrationSuccessResult,
} from '@kbn/embeddable-plugin/server';

interface LegacyVisualizationSavedObjectAttributes {
  visState?: string;
}

const getVegaPanelBaseConfig = (sourceConfig: Record<string, unknown>) => {
  const { title, description, hide_title, hide_border, time_range, drilldowns } = sourceConfig;

  return omitUndefined({
    title,
    description,
    hide_title,
    hide_border,
    time_range,
    drilldowns,
  });
};

export async function migrateLegacyVegaPanels(
  panels: readonly PanelTypeMigrationPanel[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<readonly PanelTypeMigrationResult[]> {
  const results: Array<PanelTypeMigrationSuccessResult | PanelTypeMigrationErrorResult> = [];

  const byRefCandidates: Array<{
    panelId: string;
    savedObjectId: string;
    baseConfig: Record<string, unknown>;
  }> = [];

  for (const panel of panels) {
    const config = panel.config;
    const byValueResult = getByValueVegaResult(panel.id, config);
    if (byValueResult) {
      results.push(byValueResult);
      continue;
    }

    if (isVisualizeByReferenceState(config)) {
      byRefCandidates.push({
        panelId: panel.id,
        savedObjectId: config.savedObjectId,
        baseConfig: getVegaPanelBaseConfig(config),
      });
    }
  }

  if (byRefCandidates.length === 0) {
    return results;
  }

  const uniqueSavedObjectIds = Array.from(new Set(byRefCandidates.map((c) => c.savedObjectId)));

  let bulkGetResponse;
  try {
    bulkGetResponse = await savedObjectsClient.bulkGet(
      uniqueSavedObjectIds.map((id) => ({ type: VISUALIZE_SAVED_OBJECT_TYPE, id }))
    );
  } catch (e) {
    const error = toError(e);
    return [...results, ...byRefCandidates.map((c) => ({ panelId: c.panelId, error }))] as const;
  }

  const byId = new Map<string, unknown>();
  uniqueSavedObjectIds.forEach((id, idx) => {
    byId.set(id, bulkGetResponse.saved_objects[idx]);
  });

  for (const candidate of byRefCandidates) {
    const bulkItem = byId.get(candidate.savedObjectId);
    if (!bulkItem) {
      results.push({
        panelId: candidate.panelId,
        error: new Error(`Missing bulkGet result for visualization "${candidate.savedObjectId}"`),
      });
      continue;
    }

    if (isSavedObjectErrorResult(bulkItem as any)) {
      results.push({
        panelId: candidate.panelId,
        error: new Error((bulkItem as any).error.message),
      });
      continue;
    }

    const attributes = (bulkItem as any).attributes as
      | LegacyVisualizationSavedObjectAttributes
      | undefined;
    const visStateString = attributes?.visState;
    if (typeof visStateString !== 'string') {
      results.push({
        panelId: candidate.panelId,
        error: new Error(`Visualization "${candidate.savedObjectId}" is missing visState`),
      });
      continue;
    }

    let visState: unknown;
    try {
      visState = JSON.parse(visStateString);
    } catch (e) {
      results.push({
        panelId: candidate.panelId,
        error: new Error(
          `Unable to parse visualization "${candidate.savedObjectId}" visState. Error: ${
            toError(e).message
          }`
        ),
      });
      continue;
    }

    if (!isPlainObject(visState) || (visState as any).type !== 'vega') {
      continue;
    }

    const spec = isPlainObject((visState as any).params)
      ? (visState as any).params.spec
      : undefined;
    if (typeof spec !== 'string') {
      results.push({
        panelId: candidate.panelId,
        error: new Error(`Visualization "${candidate.savedObjectId}" is missing Vega spec`),
      });
      continue;
    }

    results.push({
      panelId: candidate.panelId,
      config: {
        ...candidate.baseConfig,
        spec,
      },
    });
  }

  return results;
}

function getByValueVegaResult(
  panelId: string,
  config: Record<string, unknown>
): PanelTypeMigrationResult | undefined {
  if (!isVisualizeByValueState(config)) {
    return undefined;
  }

  if (config.savedVis.type !== 'vega') {
    return undefined;
  }

  const spec = getVegaSpecFromSavedVis(config.savedVis);
  if (typeof spec !== 'string') {
    return { panelId, error: new Error('By-value Vega visualization is missing spec') };
  }

  return {
    panelId,
    config: {
      ...getVegaPanelBaseConfig(config),
      spec,
    },
  };
}

function getVegaSpecFromSavedVis(savedVis: VisualizeByValueState['savedVis']): string | undefined {
  if (!isPlainObject(savedVis.params)) {
    return undefined;
  }

  const spec = (savedVis.params as any).spec;
  return typeof spec === 'string' ? spec : undefined;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}
