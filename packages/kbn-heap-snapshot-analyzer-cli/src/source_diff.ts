/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type SourceAttribution =
  | 'allocation'
  | 'direct-package'
  | 'inferred-package'
  | 'unattributed';

export interface SourceSummaryRow {
  source: string;
  allocator: string;
  package: string;
  nodeType: string;
  attribution: SourceAttribution;
  selfBytes: number;
  count: number;
}

export interface SourceSummary {
  snapshot: string;
  totalSelf: number;
  nodeCount: number;
  hasAllocationTracking: boolean;
  rows: SourceSummaryRow[];
}

export interface SourceDiffRow {
  source: string;
  allocator: string;
  package: string;
  nodeType: string;
  attribution: SourceAttribution;
  beforeBytes: number;
  afterBytes: number;
  deltaBytes: number;
  beforeCount: number;
  afterCount: number;
  deltaCount: number;
}

export interface SourcePackageDiffRow {
  package: string;
  beforeBytes: number;
  afterBytes: number;
  deltaBytes: number;
  beforeCount: number;
  afterCount: number;
  deltaCount: number;
}

export interface SourceDiffReport {
  baseline: {
    snapshot: string;
    totalSelf: number;
    nodeCount: number;
    hasAllocationTracking: boolean;
  };
  current: {
    snapshot: string;
    totalSelf: number;
    nodeCount: number;
    hasAllocationTracking: boolean;
  };
  totalDeltaBytes: number;
  attributedDeltaBytes: number;
  reconciled: boolean;
  packages: SourcePackageDiffRow[];
  rows: SourceDiffRow[];
}

const sourceRowKey = ({
  source,
  allocator,
  package: packageName,
  nodeType,
  attribution,
}: Pick<
  SourceSummaryRow,
  'source' | 'allocator' | 'package' | 'nodeType' | 'attribution'
>): string => JSON.stringify([source, allocator, packageName, nodeType, attribution]);

export const normalizeSourcePath = (source: string): string => {
  const normalized = source
    .replace(/^file:\/\//, '')
    .replaceAll('\\', '/')
    .split(/[?#]/, 1)[0];
  if (normalized.length === 0) return '(unknown source)';

  const nodeModulesIndex = normalized.lastIndexOf('/node_modules/');
  if (nodeModulesIndex !== -1) return normalized.slice(nodeModulesIndex + 1);

  for (const directory of ['/x-pack/', '/packages/', '/src/']) {
    const index = normalized.indexOf(directory);
    if (index !== -1) return normalized.slice(index + 1);
  }

  const imageRoot = '/usr/share/kibana/';
  const imageRootIndex = normalized.indexOf(imageRoot);
  if (imageRootIndex !== -1) return normalized.slice(imageRootIndex + imageRoot.length);

  return normalized;
};

export const buildSourceDiff = (
  baseline: SourceSummary,
  current: SourceSummary
): SourceDiffReport => {
  const baselineByKey = new Map(baseline.rows.map((row) => [sourceRowKey(row), row]));
  const currentByKey = new Map(current.rows.map((row) => [sourceRowKey(row), row]));
  const keys = new Set([...baselineByKey.keys(), ...currentByKey.keys()]);

  const rows: SourceDiffRow[] = [];
  for (const key of keys) {
    const before = baselineByKey.get(key);
    const after = currentByKey.get(key);
    const identity = after ?? before;
    if (identity === undefined) continue;

    const beforeBytes = before?.selfBytes ?? 0;
    const afterBytes = after?.selfBytes ?? 0;
    const beforeCount = before?.count ?? 0;
    const afterCount = after?.count ?? 0;
    rows.push({
      source: identity.source,
      allocator: identity.allocator,
      package: identity.package,
      nodeType: identity.nodeType,
      attribution: identity.attribution,
      beforeBytes,
      afterBytes,
      deltaBytes: afterBytes - beforeBytes,
      beforeCount,
      afterCount,
      deltaCount: afterCount - beforeCount,
    });
  }

  rows.sort((left, right) => Math.abs(right.deltaBytes) - Math.abs(left.deltaBytes));
  const aggregatePackages = (
    summary: SourceSummary
  ): Map<string, { bytes: number; count: number }> => {
    const packages = new Map<string, { bytes: number; count: number }>();
    for (const row of summary.rows) {
      const totals = packages.get(row.package) ?? { bytes: 0, count: 0 };
      totals.bytes += row.selfBytes;
      totals.count += row.count;
      packages.set(row.package, totals);
    }
    return packages;
  };
  const baselinePackages = aggregatePackages(baseline);
  const currentPackages = aggregatePackages(current);
  const packageNames = new Set([...baselinePackages.keys(), ...currentPackages.keys()]);
  const packages: SourcePackageDiffRow[] = [...packageNames].map((packageName) => {
    const before = baselinePackages.get(packageName);
    const after = currentPackages.get(packageName);
    const beforeBytes = before?.bytes ?? 0;
    const afterBytes = after?.bytes ?? 0;
    const beforeCount = before?.count ?? 0;
    const afterCount = after?.count ?? 0;
    return {
      package: packageName,
      beforeBytes,
      afterBytes,
      deltaBytes: afterBytes - beforeBytes,
      beforeCount,
      afterCount,
      deltaCount: afterCount - beforeCount,
    };
  });
  packages.sort((left, right) => Math.abs(right.deltaBytes) - Math.abs(left.deltaBytes));

  const totalDeltaBytes = current.totalSelf - baseline.totalSelf;
  const attributedDeltaBytes = rows.reduce((total, row) => total + row.deltaBytes, 0);

  return {
    baseline: {
      snapshot: baseline.snapshot,
      totalSelf: baseline.totalSelf,
      nodeCount: baseline.nodeCount,
      hasAllocationTracking: baseline.hasAllocationTracking,
    },
    current: {
      snapshot: current.snapshot,
      totalSelf: current.totalSelf,
      nodeCount: current.nodeCount,
      hasAllocationTracking: current.hasAllocationTracking,
    },
    totalDeltaBytes,
    attributedDeltaBytes,
    reconciled: totalDeltaBytes === attributedDeltaBytes,
    packages,
    rows,
  };
};
