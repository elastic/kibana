/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { EmptyPage } from '.';

describe('EmptyPage component', () => {
  it('renders actions without descriptions', () => {
    const actions = {
      actions: {
        label: 'Do Something',
        url: 'my/url/from/nowwhere',
      },
    };
    const EmptyComponent = shallow(<EmptyPage actions={actions} title="My Super Title" />);
    expect(EmptyComponent).toMatchSnapshot();
  });

  it('renders actions with descriptions', () => {
    const actions = {
      actions: {
        description: 'My Description',
        label: 'Do Something',
        url: 'my/url/from/nowwhere',
      },
    };
    const EmptyComponent = shallow(<EmptyPage actions={actions} title="My Super Title" />);
    expect(EmptyComponent).toMatchSnapshot();
  });
});
