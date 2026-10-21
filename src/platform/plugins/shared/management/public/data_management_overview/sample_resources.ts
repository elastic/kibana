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
    defaultMessage: 'Dataset',
  }),
  stream: i18n.translate('management.dataManagementOverview.resourceType.stream', {
    defaultMessage: 'Stream',
  }),
} as const;

export type ResourceKind = keyof typeof resourceTypeLabels;

export type DataManagementResource = ContentListItem<{
  kind: ResourceKind;
  type: (typeof resourceTypeLabels)[ResourceKind];
}>;

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

export const toResource = (name: string, kind: ResourceKind): DataManagementResource => ({
  id: `${kind}:${name}`,
  title: name,
  kind,
  type: resourceTypeLabels[kind],
});
