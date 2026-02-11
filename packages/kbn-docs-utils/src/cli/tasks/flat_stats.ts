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

import type { ApiDeclaration, MissingApiItemMap, PluginOrPackage } from '../../types';
import type { AllPluginStats, BuildApiMapResult } from '../types';

const getLink = (declaration: ApiDeclaration): string => {
  const base = `https://github.com/elastic/kibana/blob/main/${declaration.path}`;
  if (declaration.lineNumber) {
    return `${base}#L${declaration.lineNumber}`;
  }
  return `https://github.com/elastic/kibana/tree/main/${
    declaration.path
  }#:~:text=${encodeURIComponent(declaration.label)}`;
};

const mapStat = (dec: ApiDeclaration) => ({
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
) => {
  const missingExportsCount = missingApiItems[pluginId]
    ? Object.keys(missingApiItems[pluginId]).length
    : 0;
  const missingExportsList = missingApiItems[pluginId]
    ? Object.keys(missingApiItems[pluginId]).map((source) => ({
        source,
        references: missingApiItems[pluginId][source],
      }))
    : [];

  return {
    counts: {
      apiCount: pluginStats.apiCount,
      missingExports: missingExportsCount,
      missingComments: pluginStats.missingComments.length,
      isAnyType: pluginStats.isAnyType.length,
      noReferences: pluginStats.noReferences.length,
      paramDocMismatches: pluginStats.paramDocMismatches.length,
    },
    missingComments: pluginStats.missingComments.map(mapStat),
    isAnyType: pluginStats.isAnyType.map(mapStat),
    noReferences: pluginStats.noReferences.map(mapStat),
    paramDocMismatches: pluginStats.paramDocMismatches.map(mapStat),
    missingExports: missingExportsList,
  };
};

export const writeFlatStatsFiles = (
  plugins: PluginOrPackage[],
  apiMapResult: BuildApiMapResult,
  allPluginStats: AllPluginStats
) => {
  for (const plugin of plugins) {
    const stats = allPluginStats[plugin.id];
    if (!stats) continue;
    const flat = buildFlatStatsForPlugin(plugin.id, stats, apiMapResult.missingApiItems);
    const pluginTargetDir = Path.resolve(plugin.directory, 'target', 'api_docs');
    fs.mkdirSync(pluginTargetDir, { recursive: true });
    const target = Path.join(pluginTargetDir, 'stats.json');
    fs.writeFileSync(target, JSON.stringify(flat, null, 2));
  }
};
