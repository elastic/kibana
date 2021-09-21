/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from 'kibana/server';

import { MAX_BUCKETS_SETTING } from '../common/constants';

export const getUiSettings: () => Record<string, UiSettingsParams> = () => ({
  [MAX_BUCKETS_SETTING]: {
    name: i18n.translate('visTypeTimeseries.advancedSettings.maxBucketsTitle', {
      defaultMessage: 'TSVB buckets limit',
    }),
    value: 2000,
    description: i18n.translate('visTypeTimeseries.advancedSettings.maxBucketsText', {
      defaultMessage:
        'Affects the TSVB histogram density. Must be set higher than "histogram:maxBars".',
    }),
    schema: schema.number(),
  },
});
