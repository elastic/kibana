/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { getContextHash, useNavigationProps, UseNavigationProps } from './use_navigation_props';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const filterManager = createFilterManagerMock();
const defaultProps = {
  dataViewId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
  rowIndex: 'kibana_sample_data_ecommerce',
  rowId: 'QmsYdX0BQ6gV8MTfoPYE',
  columns: ['customer_first_name', 'products.manufacturer'],
  filterManager,
  addBasePath: jest.fn(),
} as UseNavigationProps;
const basePathPrefix = 'localhost:5601/xqj';

const getSearch = () => {
  return `?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))
  &_a=(columns:!(${defaultProps.columns.join()}),filters:!(),index:${defaultProps.dataViewId}
  ,interval:auto,query:(language:kuery,query:''),sort:!(!(order_date,desc)))`;
};

const getSingeDocRoute = () => {
  return `/doc/${defaultProps.dataViewId}/${defaultProps.rowIndex}`;
};

const getContextRoute = () => {
  return `/context/${defaultProps.dataViewId}/${defaultProps.rowId}`;
};

const render = (withRouter = true, props?: Partial<UseNavigationProps>) => {
  const history = createMemoryHistory({
    initialEntries: ['/' + getSearch()],
  });
  const wrapper = ({ children }: { children: ReactElement }) => (
    <KibanaContextProvider services={{ history: () => history }}>
      {withRouter ? <Router history={history}>{children}</Router> : children}
    </KibanaContextProvider>
  );
  return {
    result: renderHook(() => useNavigationProps({ ...defaultProps, ...props }), { wrapper }).result,
    history,
  };
};

describe('useNavigationProps', () => {
  test('should provide valid breadcrumb for single doc page from main view', () => {
    const { result, history } = render();

    // @ts-expect-error
    result.current.singleDocProps.onClick();
    expect(history.location.pathname).toEqual(getSingeDocRoute());
    expect(history.location.search).toEqual(
      `?id=${defaultProps.rowId}&breadcrumb=${encodeURIComponent(`#/${getSearch()}`)}`
    );
  });

  test('should provide valid breadcrumb for context page from main view', () => {
    const { result, history } = render();

    // @ts-expect-error
    result.current.surrDocsProps.onClick();
    expect(history.location.pathname).toEqual(getContextRoute());
    expect(history.location.search).toEqual(
      `?${getContextHash(defaultProps.columns, filterManager)}&breadcrumb=${encodeURIComponent(
        `#/${getSearch()}`
      )}`
    );
  });

  test('should create valid links to the context and single doc pages from embeddable', () => {
    const { result } = render(false, { addBasePath: (val: string) => `${basePathPrefix}${val}` });

    expect(result.current.singleDocProps.href!).toEqual(
      `${basePathPrefix}/app/discover#${getSingeDocRoute()}?id=${defaultProps.rowId}`
    );
    expect(result.current.surrDocsProps.href!).toEqual(
      `${basePathPrefix}/app/discover#${getContextRoute()}?${getContextHash(
        defaultProps.columns,
        filterManager
      )}`
    );
  });
});
