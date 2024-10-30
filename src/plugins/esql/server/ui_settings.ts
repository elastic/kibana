/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import type { UiSettingsParams } from '@kbn/core/server';
import { ENABLE_ESQL } from '@kbn/esql-utils';

export const getUiSettings: () => Record<string, UiSettingsParams> = () => ({
  [ENABLE_ESQL]: {
    name: i18n.translate('esql.advancedSettings.enableESQLTitle', {
      defaultMessage: 'Enable ES|QL',
    }),
    value: true,
    description: i18n.translate('esql.advancedSettings.enableESQLDescription', {
      defaultMessage:
        'This setting enables ES|QL in Kibana. By switching it off you will hide the ES|QL user interface from various applications. However, users will be able to access existing ES|QL saved searches, visualizations, etc.',
    }),
    requiresPageReload: true,
    schema: schema.boolean(),
  },
});
