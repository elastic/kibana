/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type AdoptionTrackedAPIsByPlugin,
  type ApiDeclaration,
  type ApiStats,
  type IssuesByPlugin,
  type PluginApi,
  TypeKind,
} from './types';

/**
 * Collects API stats for a single plugin.
 */
export function collectApiStatsForPlugin(doc: PluginApi, issues: IssuesByPlugin): ApiStats {
  const { missingApiItems, referencedDeprecations, adoptionTrackedAPIs } = issues;

  const stats: ApiStats = {
    missingComments: [],
    isAnyType: [],
    noReferences: [],
    deprecatedAPIsReferencedCount: 0,
    unreferencedDeprecatedApisCount: 0,
    adoptionTrackedAPIs: [],
    adoptionTrackedAPIsCount: 0,
    adoptionTrackedAPIsUnreferencedCount: 0,
    apiCount: countApiForPlugin(doc),
    missingExports: Object.values(missingApiItems[doc.id] ?? {}).length,
  };
  Object.values(doc.client).forEach((def) => {
    collectStatsForApi(def, stats, doc);
  });
  Object.values(doc.server).forEach((def) => {
    collectStatsForApi(def, stats, doc);
  });
  Object.values(doc.common).forEach((def) => {
    collectStatsForApi(def, stats, doc);
  });
  stats.deprecatedAPIsReferencedCount = referencedDeprecations[doc.id]
    ? referencedDeprecations[doc.id].length
    : 0;

  collectAdoptionTrackedAPIStats(doc, stats, adoptionTrackedAPIs);

  return stats;
}

function collectAdoptionTrackedAPIStats(
  doc: PluginApi,
  stats: ApiStats,
  adoptionTrackedAPIs: AdoptionTrackedAPIsByPlugin
) {
  stats.adoptionTrackedAPIs = adoptionTrackedAPIs[doc.id] || [];
  stats.adoptionTrackedAPIsCount = stats.adoptionTrackedAPIs.length;
  stats.adoptionTrackedAPIsUnreferencedCount = stats.adoptionTrackedAPIs.filter(
    ({ references }) => references.length === 0
  ).length;
}

function collectStatsForApi(doc: ApiDeclaration, stats: ApiStats, pluginApi: PluginApi): void {
  const missingComment = doc.description === undefined || doc.description.length === 0;
  // Ignore all stats coming from third party libraries, we can't fix that!
  if (doc.path.includes('node_modules')) return;

  if (missingComment) {
    stats.missingComments.push(doc);
  }

  if (doc.type === TypeKind.AnyKind) {
    stats.isAnyType.push(doc);
  }
  if (doc.children) {
    doc.children.forEach((child) => {
      collectStatsForApi(child, stats, pluginApi);
    });
  }
  if (!doc.references || doc.references.length === 0) {
    stats.noReferences.push(doc);
  }
}

function countApiForPlugin(doc: PluginApi) {
  return (
    doc.client.reduce((sum, def) => {
      return sum + countApi(def);
    }, 0) +
    doc.server.reduce((sum, def) => {
      return sum + countApi(def);
    }, 0) +
    doc.common.reduce((sum, def) => {
      return sum + countApi(def);
    }, 0)
  );
}

function countApi(doc: ApiDeclaration): number {
  if (!doc.children) return 1;
  else
    return (
      1 +
      doc.children.reduce((sum, child) => {
        return sum + countApi(child);
      }, 0)
    );
}
