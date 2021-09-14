/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '../types';

export const getMiscUiSettings = (): Record<string, UiSettingsParams> => {
  return {
    'truncate:maxHeight': {
      name: i18n.translate('core.ui_settings.params.maxCellHeightTitle', {
        defaultMessage: 'Maximum table cell height',
      }),
      value: 115,
      description: i18n.translate('core.ui_settings.params.maxCellHeightText', {
        defaultMessage:
          'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation',
      }),
      schema: schema.number({ min: 0 }),
    },
    buildNum: {
      readonly: true,
      schema: schema.maybe(schema.number()),
    },
  };
};
