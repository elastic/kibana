/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function groupBySource(dependencies: Array<{ from: string; to: string }>) {
  const packageMap = new Map();

  for (const dep of dependencies) {
    const { from, to } = dep;

    if (!packageMap.has(from)) {
      packageMap.set(from, new Set());
    }

    packageMap.get(from).add(to.replace(/^node_modules\//, ''));
  }

  const result: Record<string, string[]> = {};

  for (const [key, value] of packageMap.entries()) {
    result[key] = Array.from(value);
  }

  return result;
}
