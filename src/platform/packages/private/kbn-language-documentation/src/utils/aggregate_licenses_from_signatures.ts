/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Signature } from '../types';

/**
 * Aggregates licenses from an array of signatures into a map.
 * The map's key is the license name, and the value is a Set of associated parameter types.
 */

export function aggregateLicensesFromSignatures(signatures: Signature[]): Map<string, Set<string>> {
  const licensesMap = new Map<string, Set<string>>();

  for (const sig of signatures) {
    if (sig.license) {
      if (!licensesMap.has(sig.license)) {
        licensesMap.set(sig.license, new Set<string>());
      }
      const paramTypes = licensesMap.get(sig.license)!;
      sig.params?.forEach((param) => {
        if (param.type) {
          paramTypes.add(param.type);
        }
      });
    }
  }

  return licensesMap;
}
