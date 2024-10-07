/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GuideCards, GuideCardsProps } from './guide_cards';

const defaultProps: GuideCardsProps = {
  activateGuide: jest.fn(),
  navigateToApp: jest.fn(),
  activeFilter: 'all',
  guidesState: [],
};

describe('guide cards', () => {
  describe('snapshots', () => {
    test('should render all cards', async () => {
      const component = await shallow(<GuideCards {...defaultProps} />);
      expect(component).toMatchSnapshot();
    });
  });
});
