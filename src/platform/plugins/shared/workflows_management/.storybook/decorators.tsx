/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { Decorator } from '@storybook/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockUiSettingsService } from '../public/shared/mocks/mock_ui_settings_service';

/**
 * Alternative decorator using the standard Storybook decorator pattern
 */
export const kibanaReactDecorator: Decorator = (story: Function) => {
  return (
    <I18nProvider>
      <KibanaContextProvider
        services={
          {
            settings: {
              client: mockUiSettingsService(),
            },
          } as unknown as CoreStart
        }
      >
        {story()}
      </KibanaContextProvider>
    </I18nProvider>
  );
};
