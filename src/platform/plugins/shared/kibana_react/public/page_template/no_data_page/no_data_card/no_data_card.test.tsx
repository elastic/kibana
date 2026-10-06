/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    test('recommended', () => {
      const component = render(
        <NoDataCard recommended title="Card title" description="Description" />
      );
      expect(component).toMatchSnapshot();
    });

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

    test('href without button renders a footer button labeled with the title', () => {
      const component = render(
        <NoDataCard href="#" title="Card title" description="Description" />
      );
      expect(component).toMatchSnapshot();
    });

    test('no button and no href/onClick renders no footer control', () => {
      const component = render(<NoDataCard title="Card title" description="Description" />);
      expect(component).toMatchSnapshot();
    });

    test('target and rel are forwarded to the footer button', () => {
      const component = render(
        <NoDataCard
          href="#"
          target="_blank"
          rel="noopener"
          button="Button"
          title="Card title"
          description="Description"
        />
      );
      expect(component).toMatchSnapshot();
    });
  });
});
