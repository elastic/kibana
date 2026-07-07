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

export const getAccessibilitySettings = (): Record<string, UiSettingsParams> => {
  return {
    'accessibility:disableAnimations': {
      name: i18n.translate('core.ui_settings.params.disableAnimationsTitle', {
        defaultMessage: 'Disable Animations',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.disableAnimationsText', {
        defaultMessage:
          'Turn off all unnecessary animations in the Kibana UI. Refresh the page to apply the changes.',
      }),
      category: ['accessibility'],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
  };
};
