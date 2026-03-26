/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from '../diff/breaking_rules';
import {
  loadTerraformApis,
  buildTerraformApiIndex,
  normalizePath,
  type TerraformApi,
} from './load_terraform_apis';

export interface TerraformImpact {
  change: BreakingChange;
  terraformResource: string;
}

export interface TerraformImpactResult {
  impactedChanges: TerraformImpact[];
  hasImpact: boolean;
}

export const checkTerraformImpact = (
  breakingChanges: BreakingChange[],
  terraformApisPath?: string
): TerraformImpactResult => {
  const apis = loadTerraformApis(terraformApisPath);

  if (apis.length === 0) {
    return { impactedChanges: [], hasImpact: false };
  }

  const apiIndex = buildTerraformApiIndex(apis);

  const impactedChanges = breakingChanges
    .map((change) => {
      const matchedApi = findMatchingTerraformApi(change, apiIndex);
      return matchedApi ? { change, terraformResource: matchedApi.resource } : null;
    })
    .filter((impact): impact is TerraformImpact => impact !== null);

  return {
    impactedChanges,
    hasImpact: impactedChanges.length > 0,
  };
};

const findMatchingTerraformApi = (
  change: BreakingChange,
  apiIndex: Map<string, Map<string, TerraformApi>>
): TerraformApi | undefined => {
  const normalizedPath = normalizePath(change.path);
  const methodMap = apiIndex.get(normalizedPath);

  if (!methodMap) {
    return undefined;
  }

  if (change.method) {
    return methodMap.get(change.method.toUpperCase());
  }

  return methodMap.values().next().value;
};
