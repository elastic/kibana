/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/server';
import { DATA_VIEWS_FIELDS_EXCLUDED_TIERS } from '../common/constants';

export const uiSettingsConfig: Record<string, UiSettingsParams> = {
  [DATA_VIEWS_FIELDS_EXCLUDED_TIERS]: {
    /*
    name: i18n.translate('discover.advancedSettings.defaultColumnsTitle', {
      defaultMessage: 'Default columns',
    }),
    */
    name: 'Data tiers excluded from field requests',
    value: '',
    type: 'string',
    description: 'Exclude fields from specified tiers (such as frozen) for faster performance',
    /*
    description: i18n.translate('discover.advancedSettings.defaultColumnsText', {
      defaultMessage:
        'Columns displayed by default in the Discover app. If empty, a summary of the document will be displayed.',
    }),
    */
    schema: schema.string(),
  },
};
