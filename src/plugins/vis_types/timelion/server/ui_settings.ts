/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/server';

import { UI_SETTINGS } from '../common/constants';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    [UI_SETTINGS.ES_TIMEFIELD]: {
      name: i18n.translate('timelion.uiSettings.timeFieldLabel', {
        defaultMessage: 'Time field',
      }),
      value: '@timestamp',
      description: i18n.translate('timelion.uiSettings.timeFieldDescription', {
        defaultMessage: 'Default field containing a timestamp when using {esParam}',
        values: { esParam: '.es()' },
      }),
      category: ['timelion'],
      schema: schema.string(),
    },
    [UI_SETTINGS.DEFAULT_INDEX]: {
      name: i18n.translate('timelion.uiSettings.defaultIndexLabel', {
        defaultMessage: 'Default index',
      }),
      value: '_all',
      description: i18n.translate('timelion.uiSettings.defaultIndexDescription', {
        defaultMessage: 'Default elasticsearch index to search with {esParam}',
        values: { esParam: '.es()' },
      }),
      category: ['timelion'],
      schema: schema.string(),
    },
    [UI_SETTINGS.TARGET_BUCKETS]: {
      name: i18n.translate('timelion.uiSettings.targetBucketsLabel', {
        defaultMessage: 'Target buckets',
      }),
      value: 200,
      description: i18n.translate('timelion.uiSettings.targetBucketsDescription', {
        defaultMessage: 'The number of buckets to shoot for when using auto intervals',
      }),
      category: ['timelion'],
      schema: schema.number(),
    },
    [UI_SETTINGS.MAX_BUCKETS]: {
      name: i18n.translate('timelion.uiSettings.maximumBucketsLabel', {
        defaultMessage: 'Maximum buckets',
      }),
      value: 2000,
      description: i18n.translate('timelion.uiSettings.maximumBucketsDescription', {
        defaultMessage: 'The maximum number of buckets a single datasource can return',
      }),
      category: ['timelion'],
      schema: schema.number(),
    },
    [UI_SETTINGS.MIN_INTERVAL]: {
      name: i18n.translate('timelion.uiSettings.minimumIntervalLabel', {
        defaultMessage: 'Minimum interval',
      }),
      value: '1ms',
      description: i18n.translate('timelion.uiSettings.minimumIntervalDescription', {
        defaultMessage: 'The smallest interval that will be calculated when using "auto"',
        description: '"auto" is a technical value in that context, that should not be translated.',
      }),
      category: ['timelion'],
      schema: schema.string(),
    },
  };
}
