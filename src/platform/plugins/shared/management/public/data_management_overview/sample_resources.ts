/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list';
import type { IndexHealth } from './resource_stats';

const STANDARD_INDEX_MODE = 'standard';
const LOGSDB_INDEX_MODE = 'logsdb';
const TIME_SERIES_INDEX_MODE = 'time_series';
const LOOKUP_INDEX_MODE = 'lookup';
const VECTOR_INDEX_MODE = 'vectordb_document';

/** Type-column label for an index, including lookup and vector modes. */
const indexModeTypeLabels: Record<string, string> = {
  [STANDARD_INDEX_MODE]: i18n.translate(
    'management.dataManagementOverview.resourceType.standardIndex',
    { defaultMessage: 'Standard index' }
  ),
  [LOGSDB_INDEX_MODE]: i18n.translate(
    'management.dataManagementOverview.resourceType.logsdbIndex',
    {
      defaultMessage: 'LogsDB index',
    }
  ),
  [TIME_SERIES_INDEX_MODE]: i18n.translate(
    'management.dataManagementOverview.resourceType.timeSeriesIndex',
    { defaultMessage: 'Time series index' }
  ),
  [LOOKUP_INDEX_MODE]: i18n.translate(
    'management.dataManagementOverview.resourceType.lookupIndex',
    { defaultMessage: 'Lookup index' }
  ),
  [VECTOR_INDEX_MODE]: i18n.translate(
    'management.dataManagementOverview.resourceType.vectorIndex',
    { defaultMessage: 'VectorDB index' }
  ),
};

const resourceTypeLabels = {
  index: i18n.translate('management.dataManagementOverview.resourceType.index', {
    defaultMessage: 'Index',
  }),
  dataStream: i18n.translate('management.dataManagementOverview.resourceType.dataStream', {
    defaultMessage: 'Data stream',
  }),
  esqlView: i18n.translate('management.dataManagementOverview.resourceType.esqlView', {
    defaultMessage: 'ES|QL view',
  }),
  dataset: i18n.translate('management.dataManagementOverview.resourceType.dataset', {
    defaultMessage: 'External dataset',
  }),
  stream: i18n.translate('management.dataManagementOverview.resourceType.stream', {
    defaultMessage: 'Stream',
  }),
  lookup: i18n.translate('management.dataManagementOverview.resourceType.lookup', {
    defaultMessage: 'Lookup',
  }),
  vector: i18n.translate('management.dataManagementOverview.resourceType.vector', {
    defaultMessage: 'Vector',
  }),
} as const;

export type ResourceKind = keyof typeof resourceTypeLabels;

export type DataManagementResource = ContentListItem<{
  kind: ResourceKind;
  type: string;
  /** Index open/close status from Index Management. Absent for other resource kinds. */
  indexStatus?: string;
  /** Elasticsearch index mode. Set for indices, including lookup and vector. */
  indexMode?: string;
  /** Cluster health. Set for indices and data streams that reported it. */
  health?: IndexHealth;
}>;

const isIndexKind = (kind: ResourceKind): boolean =>
  kind === 'index' || kind === 'lookup' || kind === 'vector';

/** Lookup and vector are index modes; every other mode stays a plain index. */
export const resourceKindForIndexMode = (mode: string | undefined): ResourceKind => {
  if (mode === LOOKUP_INDEX_MODE) {
    return 'lookup';
  }
  if (mode === VECTOR_INDEX_MODE) {
    return 'vector';
  }
  return 'index';
};

const defaultIndexMode = (kind: ResourceKind): string => {
  if (kind === 'lookup') {
    return LOOKUP_INDEX_MODE;
  }
  if (kind === 'vector') {
    return VECTOR_INDEX_MODE;
  }
  return STANDARD_INDEX_MODE;
};

const indexTypeLabel = (mode: string): string =>
  indexModeTypeLabels[mode] ??
  i18n.translate('management.dataManagementOverview.resourceType.indexMode', {
    defaultMessage: '{indexMode} index',
    values: { indexMode: mode },
  });

export const RESOURCE_TYPES = (Object.keys(resourceTypeLabels) as ResourceKind[]).map((kind) => ({
  kind,
  label: resourceTypeLabels[kind],
}));

/** Maps a type label or kind id from the search bar back to a resource kind. */
export const resolveResourceKind = (value: string): ResourceKind | undefined => {
  const normalized = value.trim().toLowerCase();
  return RESOURCE_TYPES.find(
    (type) => type.kind.toLowerCase() === normalized || type.label.toLowerCase() === normalized
  )?.kind;
};

export const toResource = (
  name: string,
  kind: ResourceKind,
  indexStatus?: string,
  indexMode?: string,
  health?: IndexHealth
): DataManagementResource => {
  const mode = isIndexKind(kind) ? indexMode ?? defaultIndexMode(kind) : undefined;
  return {
    id: `${kind}:${name}`,
    title: name,
    kind,
    type: mode ? indexTypeLabel(mode) : resourceTypeLabels[kind],
    ...(indexStatus ? { indexStatus } : {}),
    ...(mode ? { indexMode: mode } : {}),
    ...(health ? { health } : {}),
  };
};
