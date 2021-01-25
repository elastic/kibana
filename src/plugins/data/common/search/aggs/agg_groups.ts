/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { $Values } from '@kbn/utility-types';

export const AggGroupNames = Object.freeze({
  Buckets: 'buckets' as 'buckets',
  Metrics: 'metrics' as 'metrics',
  None: 'none' as 'none',
});

export type AggGroupName = $Values<typeof AggGroupNames>;

export const AggGroupLabels = {
  [AggGroupNames.Buckets]: i18n.translate('data.search.aggs.aggGroups.bucketsText', {
    defaultMessage: 'Buckets',
  }),
  [AggGroupNames.Metrics]: i18n.translate('data.search.aggs.aggGroups.metricsText', {
    defaultMessage: 'Metrics',
  }),
  [AggGroupNames.None]: i18n.translate('data.search.aggs.aggGroups.noneText', {
    defaultMessage: 'None',
  }),
};
