/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';

export const hasUserDataView = jest.fn();
export const hasESData = jest.fn();

jest.doMock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        currentAppId$: new Observable<string | undefined>(),
        navigateToUrl: jest.fn(),
        capabilities: {
          navLinks: {
            integrations: {
              canAccessFleet: false,
            },
          },
        },
      },
      http: { basePath: { prepend: jest.fn((path: string) => (path ? path : 'path')) } },
      dataViews: {
        hasUserDataView: jest.fn(),
        hasData: {
          hasESData,
          hasUserDataView,
        },
      },
      dataViewEditor: indexPatternEditorPluginMock.createStartContract(),
      share: { url: { locators: { get: () => ({ useUrl: () => '' }) } } },
      uiSettings: { get: jest.fn() },
      docLinks: {
        links: {
          kibana: {
            guide: 'kibana_docs_url',
          },
        },
      },
    },
  }),
  RedirectAppLinks: jest.fn((element: JSX.Element) => element),
  overviewPageActions: jest.fn().mockReturnValue([]),
  OverviewPageFooter: jest.fn().mockReturnValue(React.createElement(React.Fragment)),
  KibanaPageTemplate: jest.fn().mockReturnValue(React.createElement(React.Fragment)),
  KibanaPageTemplateSolutionNavAvatar: jest
    .fn()
    .mockReturnValue(React.createElement(React.Fragment)),
}));

jest.doMock('../../lib/ui_metric', () => ({
  trackUiMetric: jest.fn(),
}));
