/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render } from 'enzyme';
import { RouteComponentProps } from 'react-router-dom';
import { ScopedHistory } from 'kibana/public';
import { scopedHistoryMock } from '../../../../../../../../core/public/mocks';

import { Header } from './header';

describe('Header', () => {
  test('should render normally', () => {
    const component = render(
      <Header.WrappedComponent
        indexPatternId="test"
        history={(scopedHistoryMock.create() as unknown) as ScopedHistory}
        location={({} as unknown) as RouteComponentProps['location']}
        match={({} as unknown) as RouteComponentProps['match']}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
