/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ElasticAgentCardComponent } from './elastic_agent_card.component';
import { NoDataCard } from './no_data_card';
import { Subject } from 'rxjs';

describe('ElasticAgentCardComponent', () => {
  const navigateToUrl = jest.fn();
  const currentAppId$ = new Subject<string | undefined>().asObservable();

  test('renders', () => {
    const component = shallow(
      <ElasticAgentCardComponent
        canAccessFleet={true}
        navigateToUrl={navigateToUrl}
        currentAppId$={currentAppId$}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders with canAccessFleet false', () => {
    const component = shallow(
      <ElasticAgentCardComponent
        canAccessFleet={false}
        navigateToUrl={navigateToUrl}
        currentAppId$={currentAppId$}
      />
    );
    expect(component.find(NoDataCard).props().isDisabled).toBe(true);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('recommended', () => {
      const component = shallow(
        <ElasticAgentCardComponent
          recommended
          canAccessFleet={true}
          navigateToUrl={navigateToUrl}
          currentAppId$={currentAppId$}
        />
      );
      expect(component.find(NoDataCard).props().recommended).toBe(true);
      expect(component).toMatchSnapshot();
    });

    test('button', () => {
      const component = shallow(
        <ElasticAgentCardComponent
          button="Button"
          canAccessFleet={true}
          navigateToUrl={navigateToUrl}
          currentAppId$={currentAppId$}
        />
      );
      expect(component.find(NoDataCard).props().button).toBe('Button');
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = shallow(
        <ElasticAgentCardComponent
          canAccessFleet={true}
          href={'some path'}
          navigateToUrl={navigateToUrl}
          currentAppId$={currentAppId$}
        />
      );
      expect(component.find(NoDataCard).props().href).toBe('some path');
      expect(component).toMatchSnapshot();
    });
  });
});
