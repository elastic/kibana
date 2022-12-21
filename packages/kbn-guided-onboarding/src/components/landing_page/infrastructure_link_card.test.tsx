/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { InfrastructureLinkCard } from './infrastructure_link_card';

const defaultProps = {
  navigateToApp: jest.fn(),
  isDarkTheme: false,
  addBasePath: jest.fn(),
};

describe('observability link card', () => {
  describe('snapshots', () => {
    test('should render link card for observability', async () => {
      const component = await shallow(<InfrastructureLinkCard {...defaultProps} />);
      expect(component).toMatchSnapshot();
    });
  });
});
