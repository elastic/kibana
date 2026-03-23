/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';

type DataStreamType = 'logs' | 'metrics' | 'traces' | undefined;

export function getDataStreamType(record: DataTableRecord): DataStreamType {
  const types = getFieldValue(record, 'data_stream.type') as string[] | undefined;
  if (types?.includes('logs')) return 'logs';
  if (types?.includes('metrics')) return 'metrics';
  if (types?.includes('traces')) return 'traces';
  return undefined;
}

export function getAttributesTitle(record: DataTableRecord): string {
  const type = getDataStreamType(record);

  switch (type) {
    case 'logs':
      return i18n.translate('unifiedDocViewer.docView.attributes.signalAttributesTitle.logs', {
        defaultMessage: 'Log attributes',
      });
    case 'metrics':
      return i18n.translate('unifiedDocViewer.docView.attributes.signalAttributesTitle.metrics', {
        defaultMessage: 'Metric attributes',
      });
    case 'traces':
      return i18n.translate('unifiedDocViewer.docView.attributes.signalAttributesTitle.traces', {
        defaultMessage: 'Span attributes',
      });
    default:
      return i18n.translate('unifiedDocViewer.docView.attributes.signalAttributesTitle.default', {
        defaultMessage: 'Attributes',
      });
  }
}
