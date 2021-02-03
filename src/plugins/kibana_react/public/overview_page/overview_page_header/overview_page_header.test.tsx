/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { OverviewPageHeader } from './overview_page_header';
import { shallowWithIntl } from '@kbn/test/jest';

jest.mock('../../app_links', () => ({
  RedirectAppLinks: jest.fn((element: JSX.Element) => element),
}));

jest.mock('../../context', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: { capabilities: { navLinks: { management: true, dev_tools: true } } },
      notifications: { toast: { addSuccess: jest.fn() } },
    },
  }),
}));

afterAll(() => jest.clearAllMocks());

const mockTitle = 'Page Title';
const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

describe('OverviewPageHeader', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <OverviewPageHeader addBasePath={addBasePathMock} title={mockTitle} />
    );
    expect(component).toMatchSnapshot();
  });
});
