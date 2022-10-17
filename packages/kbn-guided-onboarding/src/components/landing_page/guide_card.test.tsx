/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GuideCard } from './guide_card';

jest.mock('../../kibana_services', () => {
  const { uiSettingsServiceMock, httpServiceMock } = jest.requireActual('@kbn/core/public/mocks');
  return {
    getServices: () => ({
      uiSettings: uiSettingsServiceMock.createStartContract(),
      http: httpServiceMock.createStartContract(),
      guidedOnboardingService: jest.fn(),
    }),
  };
});
describe('guide card', () => {
  describe('snapshots', () => {
    test('should render use case card component for search', async () => {
      const component = await shallow(<GuideCard useCase="search" guides={[]} />);

      expect(component).toMatchSnapshot();
    });
    test('should render use case card component for observability', async () => {
      const component = await shallow(<GuideCard useCase="observability" guides={[]} />);

      expect(component).toMatchSnapshot();
    });
    test('should render use case card component for security', async () => {
      const component = await shallow(<GuideCard useCase="security" guides={[]} />);

      expect(component).toMatchSnapshot();
    });
  });
});
