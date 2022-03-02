/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { OverviewPageFooter } from './overview_page_footer';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

jest.mock('../../app_links', () => ({
  RedirectAppLinks: jest.fn((element: JSX.Element) => element),
}));

jest.mock('../../context', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: { capabilities: { advancedSettings: { show: true, save: true } } },
      notifications: { toast: { addSuccess: jest.fn() } },
    },
  }),
}));

jest.mock('../../ui_settings', () => ({
  useUiSetting$: jest.fn().mockReturnValue(['path-to-default-route', jest.fn()]),
}));

afterEach(() => jest.clearAllMocks());

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

describe('OverviewPageFooter', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <OverviewPageFooter addBasePath={addBasePathMock} path="new-default-route" />
    );
    expect(component).toMatchSnapshot();
  });
});
