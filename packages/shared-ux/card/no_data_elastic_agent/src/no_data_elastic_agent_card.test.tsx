/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { NoDataElasticAgentCardProvider } from './services';
import { getMockServices } from './mocks';

import { NoDataElasticAgentCard } from './no_data_elastic_agent_card';
import { NoDataElasticAgentCard as NoDataElasticAgentCardComponent } from './no_data_elastic_agent_card.component';

describe('NoDataElasticAgentCard', () => {
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    mount = (element: JSX.Element) =>
      mountWithIntl(
        <NoDataElasticAgentCardProvider {...getMockServices()}>
          {element}
        </NoDataElasticAgentCardProvider>
      );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders', () => {
    const component = mount(<NoDataElasticAgentCard />);
    expect(component.render()).toMatchSnapshot();
  });

  describe('href', () => {
    test('returns href if href is given', () => {
      const component = mount(<NoDataElasticAgentCard href={'/take/me/somewhere'} />);
      expect(component.find(NoDataElasticAgentCardComponent).props().href).toBe(
        '/take/me/somewhere'
      );
    });

    test('returns prefix + category if href is not given', () => {
      const component = mount(<NoDataElasticAgentCard category={'solutions'} />);
      expect(component.find(NoDataElasticAgentCardComponent).props().href).toBe(
        '/app/integrations/browse/solutions'
      );
    });

    test('returns prefix if no category nor href are given', () => {
      const component = mount(<NoDataElasticAgentCard />);
      expect(component.find(NoDataElasticAgentCardComponent).props().href).toBe(
        '/app/integrations/browse'
      );
    });
  });

  describe('description', () => {
    test('renders custom description if provided', () => {
      const component = mount(
        <NoDataElasticAgentCard description="Build seamless search experiences faster." />
      );
      expect(component.find(NoDataElasticAgentCardComponent).props().description).toBe(
        'Build seamless search experiences faster.'
      );
    });
  });

  describe('canAccessFleet', () => {
    test('passes in the right parameter', () => {
      const component = mount(<NoDataElasticAgentCard />);
      expect(component.find(NoDataElasticAgentCardComponent).props().canAccessFleet).toBe(true);
    });
  });
});
