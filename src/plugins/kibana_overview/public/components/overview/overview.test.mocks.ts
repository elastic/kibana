/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export const hasUserDataViewMock = jest.fn();

jest.doMock('../../../../../../src/plugins/kibana_react/public', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: { basePath: { prepend: jest.fn((path: string) => (path ? path : 'path')) } },
      dataViews: {
        hasUserDataView: hasUserDataViewMock,
      },
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
