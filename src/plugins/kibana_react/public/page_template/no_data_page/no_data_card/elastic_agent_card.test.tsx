/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ElasticAgentCard } from './elastic_agent_card';

jest.mock('../../../context', () => ({
  ...jest.requireActual('../../../context'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {
        basePath: { prepend: jest.fn((path: string) => (path ? path : 'path')) },
      },
      application: { capabilities: { navLinks: { integrations: true } } },
      uiSettings: { get: jest.fn() },
    },
  }),
}));

describe('ElasticAgentCard', () => {
  test('renders', () => {
    const component = shallow(<ElasticAgentCard solution="Solution" />);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('recommended', () => {
      const component = shallow(<ElasticAgentCard recommended solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('button', () => {
      const component = shallow(<ElasticAgentCard button="Button" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(<ElasticAgentCard href="#" button="Button" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });

    test('category', () => {
      const component = shallow(<ElasticAgentCard category="custom" solution="Solution" />);
      expect(component).toMatchSnapshot();
    });
  });
});
