/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of } from 'rxjs';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';

export const hasUserDataView = jest.fn();
export const hasESData = jest.fn();

export const applicationStartMock = applicationServiceMock.createStartContract();
applicationStartMock.capabilities = {
  ...applicationStartMock.capabilities,
  navLinks: {
    management: true,
    dev_tools: true,
  },
  dashboard_v2: { show: true },
  discover_v2: { show: true },
};

const locatorUrls: Record<string, string> = {
  CONSOLE_APP_LOCATOR: '/app/dev_tools',
  MANAGEMENT_APP_LOCATOR: '/app/management',
};

jest.doMock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: applicationStartMock,
      http: httpServiceMock.createStartContract(),
      dataViews: {
        hasUserDataView: jest.fn(),
        hasData: {
          hasESData,
          hasUserDataView,
        },
      },
      dataViewEditor: indexPatternEditorPluginMock.createStartContract(),
      share: {
        url: {
          locators: {
            get: (id: string) => ({
              useUrl: () => locatorUrls[id] ?? '',
            }),
          },
        },
      },
      uiSettings: { get: jest.fn() },
      docLinks: {
        links: {
          kibana: {
            guide: 'kibana_docs_url',
          },
        },
      },
      theme: {
        theme$: of({ darkMode: false }),
      },
    },
  }),
  OverviewPageFooter: jest.fn().mockReturnValue(React.createElement(React.Fragment)),
}));

jest.doMock('../../lib/ui_metric', () => ({
  trackUiMetric: jest.fn(),
}));
