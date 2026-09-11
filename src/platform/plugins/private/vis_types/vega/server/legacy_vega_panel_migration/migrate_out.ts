/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import isPlainObject from 'lodash/isPlainObject';
import type {
  VisualizeByReferenceState,
  VisualizeByValueState,
} from '@kbn/visualizations-plugin/common';
import type {
  PanelTypeMigrationErrorResult,
  PanelTypeMigrationPanel,
  PanelTypeMigrationResult,
  PanelTypeMigrationSuccessResult,
} from '@kbn/embeddable-plugin/server';

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

export function migrateLegacyVegaPanels(
  panels: readonly PanelTypeMigrationPanel[]
): readonly PanelTypeMigrationResult[] {
  const results: Array<PanelTypeMigrationSuccessResult | PanelTypeMigrationErrorResult> = [];

  for (const panel of panels) {
    const config = panel.config;
    const byValueResult = getByValueVegaResult(panel.id, config);
    if (byValueResult) {
      results.push(byValueResult);
    }
  }

  return results;
}

const isVisualizeByReferenceState = (
  value: Record<string, unknown>
): value is Record<string, unknown> & VisualizeByReferenceState & { savedObjectId: string } =>
  typeof value.savedObjectId === 'string' && value.savedObjectId.length > 0;

const isVisualizeByValueState = (
  value: Record<string, unknown>
): value is Record<string, unknown> & VisualizeByValueState => isPlainObject(value.savedVis);

function getByValueVegaResult(
  panelId: string,
  config: Record<string, unknown>
): PanelTypeMigrationResult | undefined {
  if (isVisualizeByReferenceState(config)) {
    return undefined;
  }

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
      spec: getStandaloneVegaSpec(spec),
    },
  };
}

function getStandaloneVegaSpec(spec: string) {
  try {
    const parsedSpec: unknown = JSON.parse(spec);
    if (isPlainObject(parsedSpec)) {
      return { format: 'json' as const, value: parsedSpec };
    }
  } catch {
    // The legacy editor treated specs that do not parse as strict JSON as HJSON.
  }

  return { format: 'hjson' as const, value: spec };
}

function getVegaSpecFromSavedVis(savedVis: VisualizeByValueState['savedVis']): string | undefined {
  if (!isPlainObject(savedVis.params)) {
    return undefined;
  }

  const { spec } = savedVis.params as Record<string, unknown>;
  return typeof spec === 'string' ? spec : undefined;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
