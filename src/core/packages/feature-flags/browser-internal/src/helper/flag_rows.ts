/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type FeatureFlagValue = boolean | number | string;
export type FeatureFlagValueType = 'boolean' | 'number' | 'string';
export type FeatureFlagSource = 'runtime' | 'config' | 'provider';

export interface FlagRow {
  key: string;
  type: FeatureFlagValueType;
  source: FeatureFlagSource;
  value: FeatureFlagValue;
  /** Where the override editor starts. A runtime override wins over the evaluated value. */
  draft: FeatureFlagValue;
  hasRuntimeOverride: boolean;
}

export interface BuildFlagRowsInput {
  snapshot: Record<string, unknown>;
  runtimeOverrides: Record<string, unknown>;
  configOverrides: Record<string, unknown>;
}

export function isFeatureFlagValue(value: unknown): value is FeatureFlagValue {
  return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';
}

function valueType(value: FeatureFlagValue): FeatureFlagValueType {
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  return 'string';
}

/**
 * One row per flag in the server snapshot or either override map.
 * Runtime overrides win, then config overrides, then the provider value.
 */
export function buildFlagRows({
  snapshot,
  runtimeOverrides,
  configOverrides,
}: BuildFlagRowsInput): FlagRow[] {
  const keys = new Set<string>([
    ...Object.keys(snapshot),
    ...Object.keys(configOverrides),
    ...Object.keys(runtimeOverrides),
  ]);

  const rows: FlagRow[] = [];
  for (const key of keys) {
    const runtime = runtimeOverrides[key];
    const config = configOverrides[key];
    const provider = snapshot[key];
    const hasRuntimeOverride = isFeatureFlagValue(runtime);
    let source: FeatureFlagSource | undefined;
    let value: FeatureFlagValue | undefined;
    if (hasRuntimeOverride) {
      source = 'runtime';
      value = runtime;
    } else if (isFeatureFlagValue(config)) {
      source = 'config';
      value = config;
    } else if (isFeatureFlagValue(provider)) {
      source = 'provider';
      value = provider;
    }
    if (value === undefined || source === undefined) {
      continue;
    }

    rows.push({
      key,
      type: valueType(value),
      source,
      value,
      draft: hasRuntimeOverride ? runtime : value,
      hasRuntimeOverride,
    });
  }

  return rows.sort((left, right) => left.key.localeCompare(right.key));
}
