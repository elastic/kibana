/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const VIEW_TYPE_KEY = 'view';

const VIEW_LABEL = i18n.translate('esqlEditor.indicesBrowser.sourceType.view', {
  defaultMessage: 'View',
});

const SOURCE_TYPE_PATTERNS = [
  { patterns: ['lookup'], label: 'Lookup Index', key: 'lookup_index' },
  { patterns: ['integration'], label: 'Integration', key: 'integration' },
  { patterns: ['timeseries', 'time series'], label: 'Timeseries', key: 'timeseries' },
  { patterns: ['stream', 'data stream'], label: 'Stream', key: 'stream' },
  { patterns: ['alias'], label: 'Alias', key: 'alias' },
  { patterns: ['external'], label: 'External data', key: 'external' },
  { patterns: ['view'], label: VIEW_LABEL, key: VIEW_TYPE_KEY },
  { patterns: ['index'], label: 'Index', key: 'index' },
] as const;

export const getSourceTypeLabel = (type?: string): string => {
  if (!type) return 'Index';
  const typeLower = type.toLowerCase();
  const match = SOURCE_TYPE_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => typeLower.includes(pattern))
  );
  return match?.label ?? type;
};

export const getSourceTypeKey = (type?: string): string => {
  if (!type) return 'index';
  const typeLower = type.toLowerCase();
  const match = SOURCE_TYPE_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => typeLower.includes(pattern))
  );
  return match?.key ?? 'index';
};
