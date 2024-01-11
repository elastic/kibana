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
import { DATA_VIEWS_FIELDS_EXCLUDED_TIERS } from '../common/constants';

export const dataTiersUiSettingsConfig: Record<string, UiSettingsParams> = {
  [DATA_VIEWS_FIELDS_EXCLUDED_TIERS]: {
    name: i18n.translate('dataViews.advancedSettings.dataTiersName', {
      defaultMessage: 'Data tiers excluded from field requests',
    }),
    value: '',
    type: 'string',
    description: i18n.translate('dataViews.advancedSettings.dataTiersText', {
      defaultMessage:
        'Exclude fields from specified tiers (such as frozen) for faster performance.',
    }),
    schema: schema.string(),
  },
};
