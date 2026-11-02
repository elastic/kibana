/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';

import type {
  ApiDeclaration,
  MissingApiItemMap,
  PluginOrPackage,
  UnnamedExport,
} from '../../types';
import type { AllPluginStats, BuildApiMapResult } from '../types';
import { getLink } from './get_link';

/** Shape of a single stat entry in the flat JSON output. */
export interface FlatStatEntry {
  id: string;
  label: string;
  path: string;
  type: ApiDeclaration['type'];
  lineNumber?: number;
  columnNumber?: number;
  link: string;
}

/** Shape of a missing-export entry in the flat JSON output. */
export interface FlatMissingExportEntry {
  source: string;
  references: string[];
}

/** Shape of an unnamed-export entry in the flat JSON output. */
export type FlatUnnamedExportEntry = Pick<
  UnnamedExport,
  'pluginId' | 'scope' | 'path' | 'lineNumber' | 'textSnippet'
>;

/** Complete flat stats JSON written per plugin/package. */
export interface FlatStats {
  counts: {
    apiCount: number;
    missingExports: number;
    missingComments: number;
    isAnyType: number;
    noReferences: number;
    missingReturns: number;
    paramDocMismatches: number;
    missingComplexTypeInfo: number;
    unnamedExports: number;
  };
  missingComments: FlatStatEntry[];
  isAnyType: FlatStatEntry[];
  noReferences: FlatStatEntry[];
  missingReturns: FlatStatEntry[];
  paramDocMismatches: FlatStatEntry[];
  missingComplexTypeInfo: FlatStatEntry[];
  missingExports: FlatMissingExportEntry[];
  unnamedExports: FlatUnnamedExportEntry[];
}

const mapStat = (dec: ApiDeclaration): FlatStatEntry => ({
  id: dec.id,
  label: dec.label,
  path: dec.path,
  type: dec.type,
  lineNumber: dec.lineNumber,
  columnNumber: dec.columnNumber,
  link: getLink(dec),
});

export const buildFlatStatsForPlugin = (
  pluginId: string,
  pluginStats: AllPluginStats[string],
  missingApiItems: MissingApiItemMap
): FlatStats => {
  const pluginMissing = missingApiItems[pluginId] ?? {};
  const missingExportsSources = Object.keys(pluginMissing);
  const missingExportsCount = missingExportsSources.length;
  const missingExportsList = missingExportsSources.map((source) => ({
    source,
    references: pluginMissing[source],
  }));

  const unnamedExportsList: FlatUnnamedExportEntry[] = (pluginStats.unnamedExports ?? []).map(
    ({ pluginId: itemPluginId, scope, path, lineNumber, textSnippet }) => ({
      pluginId: itemPluginId,
      scope,
      path,
      lineNumber,
      textSnippet,
    })
  );

  return {
    counts: {
      apiCount: pluginStats.apiCount,
      missingExports: missingExportsCount,
      missingComments: pluginStats.missingComments.length,
      isAnyType: pluginStats.isAnyType.length,
      noReferences: pluginStats.noReferences.length,
      missingReturns: pluginStats.missingReturns.length,
      paramDocMismatches: pluginStats.paramDocMismatches.length,
      missingComplexTypeInfo: pluginStats.missingComplexTypeInfo.length,
      unnamedExports: unnamedExportsList.length,
    },
    missingComments: pluginStats.missingComments.map(mapStat),
    isAnyType: pluginStats.isAnyType.map(mapStat),
    noReferences: pluginStats.noReferences.map(mapStat),
    missingReturns: pluginStats.missingReturns.map(mapStat),
    paramDocMismatches: pluginStats.paramDocMismatches.map(mapStat),
    missingComplexTypeInfo: pluginStats.missingComplexTypeInfo.map(mapStat),
    missingExports: missingExportsList,
    unnamedExports: unnamedExportsList,
  };
};

export const writeFlatStatsFiles = (
  plugins: PluginOrPackage[],
  apiMapResult: BuildApiMapResult,
  allPluginStats: AllPluginStats
) => {
  for (const plugin of plugins) {
    const stats = allPluginStats[plugin.id];
    if (!stats) {
      continue;
    }
    const flat = buildFlatStatsForPlugin(plugin.id, stats, apiMapResult.missingApiItems);
    const pluginTargetDir = Path.resolve(plugin.directory, 'target', 'api_docs');
    fs.mkdirSync(pluginTargetDir, { recursive: true });
    const target = Path.join(pluginTargetDir, 'stats.json');
    fs.writeFileSync(target, JSON.stringify(flat, null, 2));
  }
};
