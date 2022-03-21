/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactWrapper } from 'enzyme';
import React from 'react';
import { ElasticAgentCard } from './elastic_agent_card';

import { servicesFactory } from '../../../../services/mocks';
import { ServicesProvider, SharedUXServices } from '../../../../services';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ElasticAgentCardComponent } from './elastic_agent_card.component';

describe('ElasticAgentCard', () => {
  let services: SharedUXServices;
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    services = servicesFactory();
    mount = (element: JSX.Element) =>
      mountWithIntl(<ServicesProvider {...services}>{element}</ServicesProvider>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders', () => {
    const component = mount(<ElasticAgentCard />);
    expect(component).toMatchSnapshot();
  });

  describe('href', () => {
    test('returns href if href is given', () => {
      const component = mount(<ElasticAgentCard href={'/take/me/somewhere'} />);
      expect(component.find(ElasticAgentCardComponent).props().href).toBe('/take/me/somewhere');
    });

    test('returns prefix + category if href is not given', () => {
      const component = mount(<ElasticAgentCard category={'solutions'} />);
      expect(component.find(ElasticAgentCardComponent).props().href).toBe(
        '/app/integrations/browse/solutions'
      );
    });

    test('returns prefix if nor category nor href are given', () => {
      const component = mount(<ElasticAgentCard />);
      expect(component.find(ElasticAgentCardComponent).props().href).toBe(
        '/app/integrations/browse'
      );
    });
  });

  describe('canAccessFleet', () => {
    test('passes in the right parameter', () => {
      const component = mount(<ElasticAgentCard />);
      expect(component.find(ElasticAgentCardComponent).props().canAccessFleet).toBe(true);
    });
  });
});
