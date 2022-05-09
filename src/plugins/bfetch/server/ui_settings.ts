/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { DISABLE_BFETCH_COMPRESSION, DISABLE_BFETCH } from '../common';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    [DISABLE_BFETCH]: {
      name: i18n.translate('bfetch.disableBfetch', {
        defaultMessage: 'Disable request batching',
      }),
      value: false,
      description: i18n.translate('bfetch.disableBfetchDesc', {
        defaultMessage:
          'Disables requests batching. This increases number of HTTP requests from Kibana, but allows to debug requests individually.',
      }),
      schema: schema.boolean(),
      category: [],
    },
    [DISABLE_BFETCH_COMPRESSION]: {
      name: i18n.translate('bfetch.disableBfetchCompression', {
        defaultMessage: 'Disable batch compression',
      }),
      value: false,
      description: i18n.translate('bfetch.disableBfetchCompressionDesc', {
        defaultMessage:
          'Disable batch compression. This allows you to debug individual requests, but increases response size.',
      }),
      schema: schema.boolean(),
      category: [],
    },
  };
}
