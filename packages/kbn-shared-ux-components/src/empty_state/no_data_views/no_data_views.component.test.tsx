/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiButton, EuiPanel } from '@elastic/eui';
import { NoDataViews } from './no_data_views.component';
import { DocumentationLink } from './documentation_link';

describe('<NoDataViewsComponent />', () => {
  test('is rendered correctly', () => {
    const component = mountWithIntl(
      <NoDataViews
        onClickCreate={jest.fn()}
        canCreateNewDataView={true}
        dataViewsDocLink={'dummy'}
      />
    );
    expect(component.find(EuiPanel).length).toBe(1);
    expect(component.find(EuiButton).length).toBe(1);
    expect(component.find(DocumentationLink).length).toBe(1);
  });

  test('does not render button if canCreateNewDataViews is false', () => {
    const component = mountWithIntl(<NoDataViews canCreateNewDataView={false} />);

    expect(component.find(EuiButton).length).toBe(0);
  });

  test('does not documentation link if linkToDocumentation is not provided', () => {
    const component = mountWithIntl(
      <NoDataViews onClickCreate={jest.fn()} canCreateNewDataView={true} />
    );

    expect(component.find(DocumentationLink).length).toBe(0);
  });

  test('onClickCreate', () => {
    const onClickCreate = jest.fn();
    const component = mountWithIntl(
      <NoDataViews canCreateNewDataView={true} onClickCreate={onClickCreate} />
    );

    component.find('button').simulate('click');

    expect(onClickCreate).toHaveBeenCalledTimes(1);
  });
});
