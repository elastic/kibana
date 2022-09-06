/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render as enzymeRender } from 'enzyme';
import React from 'react';

import { getNoDataCardServicesMock } from '@kbn/shared-ux-card-no-data-mocks';

import { NoDataCard } from './no_data_card';
import { NoDataCardProvider } from './services';

describe('NoDataCard', () => {
  const render = (element: React.ReactElement, canAccessFleet: boolean = true) =>
    enzymeRender(
      <NoDataCardProvider {...getNoDataCardServicesMock({ canAccessFleet })}>
        {element}
      </NoDataCardProvider>
    );

  test('renders', () => {
    const component = render(<NoDataCard title="Card title" description="Description" />);
    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('button', () => {
      const component = render(
        <NoDataCard button="Button" title="Card title" description="Description" />
      );
      expect(component).toMatchSnapshot();
    });

    test('href', () => {
      const component = render(
        <NoDataCard href="#" button="Button" title="Card title" description="Description" />
      );
      expect(component).toMatchSnapshot();
    });

    test('no access to Fleet', () => {
      const component = render(
        <NoDataCard button="Button" title="Card title" description="Description" />,
        false
      );
      expect(component).toMatchSnapshot();
    });

    test('extends EuiCardProps', () => {
      const component = render(
        <NoDataCard
          button="Button"
          title="Card title"
          description="Description"
          className="custom_class"
        />
      );
      expect(component).toMatchSnapshot();
    });
  });
});
