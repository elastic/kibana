/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { DISABLE_SEARCH_COMPRESSION } from '../common';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    [DISABLE_SEARCH_COMPRESSION]: {
      name: i18n.translate('bfetch.disableSearchCompression', {
        defaultMessage: 'Disable Search Compression',
      }),
      value: false,
      description: i18n.translate('bfetch.disableSearchCompressionDesc', {
        defaultMessage:
          'Disable search compression. This allows you debug individual search requests, but increases response size.',
      }),
      schema: schema.boolean(),
      category: ['search'],
    },
  };
}
