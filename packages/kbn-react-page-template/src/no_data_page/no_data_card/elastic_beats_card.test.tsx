/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ElasticBeatsCard } from './elastic_beats_card';

jest.mock('../../../context', () => ({
  ...jest.requireActual('../../../context'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: { basePath: { prepend: jest.fn((path: string) => (path ? path : 'path')) } },
      uiSettings: { get: jest.fn() },
    },
  }),
}));

describe('ElasticBeatsCard', () => {
  test('renders', () => {
    const component = shallow(<ElasticBeatsCard solution="Solution" />);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('recommended', () => {
      const component = shallow(<ElasticBeatsCard recommended solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('button', () => {
      const component = shallow(<ElasticBeatsCard button="Button" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(<ElasticBeatsCard href="#" button="Button" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });
  });
});
