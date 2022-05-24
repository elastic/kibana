/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from 'enzyme';
import React from 'react';
import { NoDataCard } from './no_data_card';

describe('NoDataCard', () => {
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

    test('isDisabled', () => {
      const component = render(
        <NoDataCard
          isDisabled={true}
          button="Button"
          title="Card title"
          description="Description"
        />
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
