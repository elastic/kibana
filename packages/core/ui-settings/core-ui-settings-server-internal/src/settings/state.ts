/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';

export const getStateSettings = (): Record<string, UiSettingsParams> => {
  return {
    'state:storeInSessionStorage': {
      name: i18n.translate('core.ui_settings.params.storeUrlTitle', {
        defaultMessage: 'Store URLs in session storage',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.storeUrlText', {
        defaultMessage:
          'The URL can sometimes grow to be too large for some browsers to handle. ' +
          'To counter-act this we are testing if storing parts of the URL in session storage could help. ' +
          'Please let us know how it goes!',
      }),
      schema: schema.boolean(),
    },
  };
};
