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
  const { applicationServiceMock } = jest.requireActual('@kbn/core/public/mocks');
  return {
    getServices: () => ({
      application: applicationServiceMock.createStartContract(),
      trackUiMetric: jest.fn(),
    }),
  };
});
describe('use case card', () => {
  test('should render use case card component for search', async () => {
    const component = await shallow(<UseCaseCard useCase="search" />);

    expect(component).toMatchSnapshot();
  });
  test('should render use case card component for observability', async () => {
    const component = await shallow(<UseCaseCard useCase="observability" />);

    expect(component).toMatchSnapshot();
  });
  test('should render use case card component for security', async () => {
    const component = await shallow(<UseCaseCard useCase="security" />);

    expect(component).toMatchSnapshot();
  });
});
