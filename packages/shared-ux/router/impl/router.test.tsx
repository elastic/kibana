/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, FC } from 'react';
import { shallow } from 'enzyme';
import { Route } from './router';
import { createMemoryHistory } from 'history';

describe('Route', () => {
  test('renders', () => {
    const example = shallow(<Route />);
    expect(example).toMatchSnapshot();
  });

  test('location renders as expected', () => {
    // create a history
    const historyLocation = createMemoryHistory();
    // add the path to the history
    historyLocation.push('/app/wow');
    // prevent the location key from remaking itself each jest test
    historyLocation.location.key = 's5brde';
    // the Route component takes the history location
    const example = shallow(<Route location={historyLocation.location} />);
    expect(example).toMatchSnapshot();
  });

  test('component prop renders', () => {
    const sampleComponent: FC<{}> = () => {
      return <Component>Test</Component>;
    };
    const example = shallow(<Route component={sampleComponent} />);
    expect(example).toMatchSnapshot();
  });

  test('render prop renders', () => {
    const sampleReactNode = React.createElement('li', { id: 'li1' }, 'one');
    const example = shallow(<Route render={() => sampleReactNode} />);
    expect(example).toMatchSnapshot();
  });
});
