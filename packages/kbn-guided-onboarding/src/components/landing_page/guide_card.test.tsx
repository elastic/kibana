/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GuideCard, GuideCardProps } from './guide_card';

const defaultProps: GuideCardProps = {
  useCase: 'search',
  guides: [],
  activateGuide: jest.fn(),
  isDarkTheme: false,
  addBasePath: jest.fn(),
};

describe('guide card', () => {
  describe('snapshots', () => {
    test('should render use case card component for search', async () => {
      const component = await shallow(<GuideCard {...defaultProps} useCase="search" />);

      expect(component).toMatchSnapshot();
    });
    test('should render use case card component for kubernetes', async () => {
      const component = await shallow(<GuideCard {...defaultProps} useCase="kubernetes" />);

      expect(component).toMatchSnapshot();
    });
    test('should render use case card component for siem', async () => {
      const component = await shallow(<GuideCard {...defaultProps} useCase="siem" />);

      expect(component).toMatchSnapshot();
    });
  });
});
