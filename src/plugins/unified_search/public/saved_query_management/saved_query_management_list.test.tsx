/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSelectable } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { coreMock } from '../../../../core/public/mocks';
import { dataPluginMock } from '../../../data/public/mocks';
import {
  SavedQueryManagementListProps,
  SavedQueryManagementList,
} from './saved_query_management_list';

describe('Saved query management list component', () => {
  const startMock = coreMock.createStart();
  const dataMock = dataPluginMock.createStartContract();
  function wrapSavedQueriesListComponentInContext(testProps: SavedQueryManagementListProps) {
    const services = {
      uiSettings: startMock.uiSettings,
      http: startMock.http,
    };

    return (
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <SavedQueryManagementList {...testProps} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  }

  function flushEffect(component: ReactWrapper) {
    return act(async () => {
      await component;
      await new Promise((r) => setImmediate(r));
      component.update();
    });
  }
  let props: SavedQueryManagementListProps;
  beforeEach(() => {
    props = {
      onLoad: jest.fn(),
      onClearSavedQuery: jest.fn(),
      onClose: jest.fn(),
      showSaveQuery: true,
      hasFiltersOrQuery: false,
      savedQueryService: {
        ...dataMock.query.savedQueries,
        findSavedQueries: jest.fn().mockResolvedValue({
          queries: [
            {
              id: '8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a9',
              attributes: {
                title: 'Test',
                description: '',
                query: {
                  query: 'category.keyword : "Men\'s Shoes" ',
                  language: 'kuery',
                },
                filters: [],
              },
            },
          ],
        }),
        deleteSavedQuery: jest.fn(),
      },
    };
  });
  it('should render the list component if saved queries exist', async () => {
    const component = mount(wrapSavedQueriesListComponentInContext(props));
    await flushEffect(component);
    expect(component.find('[data-test-subj="saved-query-management-list"]').length).toBe(1);
  });

  it('should not rendet the list component if not saved queries exist', async () => {
    const newProps = {
      ...props,
      savedQueryService: {
        ...dataMock.query.savedQueries,
        findSavedQueries: jest.fn().mockResolvedValue({
          queries: [],
        }),
      },
    };
    const component = mount(wrapSavedQueriesListComponentInContext(newProps));
    await flushEffect(component);
    expect(component.find('[data-test-subj="saved-query-management-empty"]').length).toBeTruthy();
  });

  it('should render the saved queries on the selectable component', async () => {
    const component = mount(wrapSavedQueriesListComponentInContext(props));
    await flushEffect(component);
    expect(component.find(EuiSelectable).prop('options').length).toBe(1);
    expect(component.find(EuiSelectable).prop('options')[0].label).toBe('Test');
  });

  it('should call the onLoad function', async () => {
    const onLoadSpy = jest.fn();
    const newProps = {
      ...props,
      onLoad: onLoadSpy,
    };
    const component = mount(wrapSavedQueriesListComponentInContext(newProps));
    await flushEffect(component);
    component.find('[data-test-subj="load-saved-query-Test-button"]').first().simulate('click');
    expect(
      component.find('[data-test-subj="saved-query-management-apply-changes-button"]').length
    ).toBeTruthy();
    component
      .find('[data-test-subj="saved-query-management-apply-changes-button"]')
      .first()
      .simulate('click');
    expect(onLoadSpy).toBeCalled();
  });

  it('should render the button with the correct text', async () => {
    const component = mount(wrapSavedQueriesListComponentInContext(props));
    await flushEffect(component);
    expect(
      component
        .find('[data-test-subj="saved-query-management-apply-changes-button"]')
        .first()
        .text()
    ).toBe('Apply filter set');

    const newProps = {
      ...props,
      hasFiltersOrQuery: true,
    };
    const updatedComponent = mount(wrapSavedQueriesListComponentInContext(newProps));
    await flushEffect(component);
    expect(
      updatedComponent
        .find('[data-test-subj="saved-query-management-apply-changes-button"]')
        .first()
        .text()
    ).toBe('Replace with selected filter set');
  });

  it('should render the modal on delete', async () => {
    const component = mount(wrapSavedQueriesListComponentInContext(props));
    await flushEffect(component);
    findTestSubject(component, 'delete-saved-query-Test-button').simulate('click');
    expect(component.find('[data-test-subj="confirmModalConfirmButton"]').length).toBeTruthy();
  });
});
