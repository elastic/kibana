/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Header } from './header';

describe('Header', () => {
  it('should render normally', () => {
    const props = {
      onExportAll: () => {},
      onImport: () => {},
      onRefresh: () => {},
      totalCount: 4,
      filteredCount: 2,
    };

    const component = shallow(<Header {...props} />);

    expect(component).toMatchSnapshot();
  });
});
