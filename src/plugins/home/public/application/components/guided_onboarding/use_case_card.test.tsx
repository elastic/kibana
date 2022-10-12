/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { UseCaseCard } from './use_case_card';

jest.mock('../../kibana_services', () => {
  const { uiSettingsServiceMock, httpServiceMock } = jest.requireActual('@kbn/core/public/mocks');
  return {
    getServices: () => ({
      uiSettings: uiSettingsServiceMock.createStartContract(),
      http: httpServiceMock.createStartContract(),
    }),
  };
});
describe('use case card', () => {
  const testProps = {
    title: 'testTitle',
    description: 'testDescription',
    footer: <span>testFooter</span>,
  };
  test('should render use case card component for search', async () => {
    const component = await shallow(<UseCaseCard useCase="search" {...testProps} />);

    expect(component).toMatchSnapshot();
  });
  test('should render use case card component for observability', async () => {
    const component = await shallow(<UseCaseCard useCase="observability" {...testProps} />);

    expect(component).toMatchSnapshot();
  });
  test('should render use case card component for security', async () => {
    const component = await shallow(<UseCaseCard useCase="security" {...testProps} />);

    expect(component).toMatchSnapshot();
  });
});
