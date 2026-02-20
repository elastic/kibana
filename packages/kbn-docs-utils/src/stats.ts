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
    paramDocMismatches: [],
    missingComplexTypeInfo: [],
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

  trackParamDocMismatches(doc, stats);
  trackMissingComplexTypeInfo(doc, stats);

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

/**
 * Returns true if a declaration represents a function-like construct.
 *
 * This checks two conditions:
 * 1. The declaration has `type: FunctionKind` - covers function declarations, method signatures,
 *    and function-typed properties in interfaces/classes.
 * 2. The signature contains `=>` - covers type aliases that define function types. The API doc
 *    system normalizes all function signatures to arrow syntax, so this check is reliable.
 */
const isFunctionLike = (doc: ApiDeclaration): boolean => {
  if (doc.type === TypeKind.FunctionKind) return true;
  if (doc.signature) {
    const sig = doc.signature.map((part) => (typeof part === 'string' ? part : part.text)).join('');
    return sig.includes('=>');
  }
  return false;
};

/**
 * Tracks functions where not all parameters have documentation.
 *
 * For function-like declarations, `children` represents the function's parameters.
 * This is distinct from interface/class children which represent properties/methods.
 * Each function-like member within an interface has its own declaration with its own
 * children (parameters), so we don't conflate interface properties with function parameters.
 */
const trackParamDocMismatches = (doc: ApiDeclaration, stats: ApiStats): void => {
  if (!isFunctionLike(doc)) {
    return;
  }
  if (!doc.children || doc.children.length === 0) {
    return;
  }
  const describedParams = doc.children.filter(
    (param) => param.description && param.description.length > 0
  ).length;
  if (describedParams !== doc.children.length) {
    stats.paramDocMismatches.push(doc);
  }
};

/**
 * Tracks complex types (objects, interfaces, compound types) missing descriptions.
 */
const trackMissingComplexTypeInfo = (doc: ApiDeclaration, stats: ApiStats): void => {
  const complexKinds = new Set<TypeKind>([
    TypeKind.ObjectKind,
    TypeKind.InterfaceKind,
    TypeKind.CompoundTypeKind,
  ]);
  if (!complexKinds.has(doc.type)) return;
  const hasDescription = doc.description !== undefined && doc.description.length > 0;
  if (!hasDescription) {
    stats.missingComplexTypeInfo.push(doc);
  }
};

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
