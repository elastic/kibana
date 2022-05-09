/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from '@kbn/core/server';
import { UI_SETTINGS } from '../common/constants';

export const getUiSettings: () => Record<string, UiSettingsParams> = () => ({
  [UI_SETTINGS.MAX_BUCKETS_SETTING]: {
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
  [UI_SETTINGS.ALLOW_STRING_INDICES]: {
    name: i18n.translate('visTypeTimeseries.advancedSettings.allowStringIndicesTitle', {
      defaultMessage: 'Allow string indices in TSVB',
    }),
    value: false,
    requiresPageReload: true,
    description: i18n.translate('visTypeTimeseries.advancedSettings.allowStringIndicesText', {
      defaultMessage:
        'Enables you to query Elasticsearch indices in <strong>TSVB</strong> visualizations.',
    }),
    schema: schema.boolean(),
  },
  [UI_SETTINGS.ALLOW_CHECKING_FOR_FAILED_SHARDS]: {
    name: i18n.translate('visTypeTimeseries.advancedSettings.allowCheckingForFailedShardsTitle', {
      defaultMessage: 'Show TSVB request shard failures',
    }),
    value: true,
    description: i18n.translate(
      'visTypeTimeseries.advancedSettings.allowCheckingForFailedShardsText',
      {
        defaultMessage:
          'Show warning message for partial data in TSVB charts if the request succeeds for some shards but fails for others.',
      }
    ),
    schema: schema.boolean(),
  },
});
