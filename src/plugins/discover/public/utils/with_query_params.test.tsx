/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { mountWithIntl } from '@kbn/test/jest';
import { withQueryParams } from './with_query_params';
import { DiscoverServices } from '../build_services';
import { DiscoverRouteProps } from '../application/types';

interface ComponentProps extends DiscoverRouteProps {
  id: string;
  query: string;
}

const mountComponent = (children: ReactElement, query = '') => {
  const history = createMemoryHistory({
    initialEntries: ['/' + query],
  });
  return mountWithIntl(<Router history={history}>{children}</Router>);
};

describe('withQueryParams', () => {
  it('should display error message, when query does not contain required parameters', () => {
    const Component = withQueryParams(() => <div />, ['id', 'query']);
    const component = mountComponent(<Component services={{} as DiscoverServices} />);

    expect(component.html()).toContain('Cannot load this page');
    expect(component.html()).toContain('URL query string is missing id, query.');
  });

  it('should not display error message, when query contain required parameters', () => {
    const Component = withQueryParams(
      ({ id, query }: ComponentProps) => (
        <div>
          {id} and {query} are presented
        </div>
      ),
      ['id', 'query']
    );
    const component = mountComponent(
      <Component services={{} as DiscoverServices} />,
      '?id=one&query=another'
    );

    expect(component.html()).toContain('one and another are presented');
    expect(component.html()).not.toContain('URL query string is missing id, query.');
  });
});
