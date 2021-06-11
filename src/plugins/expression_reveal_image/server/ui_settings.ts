/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from 'kibana/server';

import { SETTING_CATEGORY } from '../../presentation_util/server';
import { LEGACY_RENDERER_LIBRARY } from '../common';

export const getUiSettingsConfig: () => Record<string, UiSettingsParams<boolean>> = () => ({
  [LEGACY_RENDERER_LIBRARY]: {
    name: i18n.translate('expressionRevealImage.advancedSettings.legacyRendererLibrary.name', {
      defaultMessage: 'Legacy expression reveal image renderer library',
    }),
    requiresPageReload: true,
    value: false,
    description: i18n.translate(
      'expressionRevealImage.advancedSettings.legacyRendererLibrary.description',
      {
        defaultMessage: 'Enables legacy renderer library for revealImage expression in canvas.',
      }
    ),
    category: [SETTING_CATEGORY],
    schema: schema.boolean(),
  },
});
