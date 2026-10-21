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

const resource = (name: string, kind: ResourceKind): DataManagementResource => ({
  id: name,
  title: name,
  kind,
  type: resourceTypeLabels[kind],
});

/** Prototype stand-ins until the overview reads real cluster resources. */
export const MOCK_RESOURCES: DataManagementResource[] = [
  resource('logs-nginx.access-default', 'index'),
  resource('metrics-system.cpu-default', 'index'),
  resource('.kibana_analytics', 'index'),
  resource('traces-apm.sampled-default', 'index'),
  resource('logs-apache.access-default', 'dataStream'),
  resource('metrics-kubernetes.pod-default', 'dataStream'),
  resource('traces-apm-default', 'dataStream'),
  resource('service-latency', 'esqlView'),
  resource('error-rate-by-host', 'esqlView'),
  resource('checkout-funnel', 'esqlView'),
  resource('billing-events', 'dataset'),
  resource('cloudtrail-us-east', 'dataset'),
  resource('github-audit', 'dataset'),
  resource('logs', 'stream'),
  resource('logs.nginx', 'stream'),
  resource('metrics', 'stream'),
  resource('metrics.system', 'stream'),
  resource('traces.apm', 'stream'),
];
