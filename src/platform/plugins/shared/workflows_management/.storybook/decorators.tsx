/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import type { Decorator } from '@storybook/react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { CommonGlobalAppStyles } from '@kbn/core-chrome-layout/layouts/common/global_app_styles';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockUiSettingsService } from '../public/shared/mocks/mock_ui_settings_service';

const createMockWebStorage = () => ({
  clear: action('WEB_STORAGE_CLEAR'),
  getItem: action('WEB_STORAGE_GET_ITEM'),
  key: action('WEB_STORAGE_KEY'),
  removeItem: action('WEB_STORAGE_REMOVE_ITEM'),
  setItem: action('WEB_STORAGE_SET_ITEM'),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  set: action('STORAGE_SET'),
  remove: action('STORAGE_REMOVE'),
  clear: action('STORAGE_CLEAR'),
  get: action('STORAGE_GET'),
});

/**
 * Alternative decorator using the standard Storybook decorator pattern
 */
export const kibanaReactDecorator: Decorator = (story: Function) => {
  return (
    <I18nProvider>
      <KibanaContextProvider
        services={
          {
            application: {
              capabilities: {
                workflowsManagement: {
                  readWorkflow: true,
                  deleteWorkflow: true,
                  createWorkflow: true,
                  updateWorkflow: true,
                  executeWorkflow: true,
                },
              },
            },
            settings: {
              client: mockUiSettingsService(),
            },
            storage: createMockStorage(),
          } as unknown as CoreStart
        }
      >
        <CommonGlobalAppStyles />
        {story()}
      </KibanaContextProvider>
    </I18nProvider>
  );
};
