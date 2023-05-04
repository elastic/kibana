/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overviewPageActions } from './overview_page_actions';
import { ApplicationStart } from '@kbn/core/public';

jest.mock('../../app_links', () => ({
  RedirectAppLinks: jest.fn((element: JSX.Element) => element),
}));

afterAll(() => jest.clearAllMocks());

const applicationStartMock = {
  capabilities: { navLinks: { management: true, dev_tools: true } },
} as unknown as ApplicationStart;

describe('overviewPageActions', () => {
  test('only add data button', () => {
    const array = overviewPageActions({
      addDataHref: '',
      application: applicationStartMock,
    });
    expect(array).toMatchSnapshot();
  });

  test('all buttons', () => {
    const array = overviewPageActions({
      addDataHref: '',
      application: applicationStartMock,
      showDevToolsLink: true,
      showManagementLink: true,
    });
    expect(array).toMatchSnapshot();
  });

  test('no buttons', () => {
    const array = overviewPageActions({
      addDataHref: '',
      application: applicationStartMock,
      hidden: true,
    });
    expect(array).toMatchSnapshot();
  });
});
