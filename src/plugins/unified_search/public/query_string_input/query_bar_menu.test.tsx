/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { coreMock } from '../../../../core/public/mocks';
import { dataPluginMock } from '../../../data/public/mocks';
import { Filter } from '@kbn/es-query';
import { QueryBarMenuProps, QueryBarMenu } from './query_bar_menu';
import { EuiPopover } from '@elastic/eui';

describe('Querybar Menu component', () => {
  const createMockWebStorage = () => ({
    clear: jest.fn(),
    getItem: jest.fn(),
    key: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
    length: 0,
  });

  const createMockStorage = () => ({
    storage: createMockWebStorage(),
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });
  const getStorage = (v: string) => {
    const storage = createMockStorage();
    storage.get.mockReturnValue(v);
    return storage;
  };

  const startMock = coreMock.createStart();
  let dataMock = dataPluginMock.createStartContract();
  function wrapQueryBarMenuComponentInContext(testProps: QueryBarMenuProps, storageValue: string) {
    dataMock = {
      ...dataMock,
      dataViews: {
        ...dataMock.dataViews,
        getIdsWithTitle: jest.fn(),
      },
    };
    const services = {
      data: dataMock,
      storage: getStorage(storageValue),
      uiSettings: startMock.uiSettings,
    };

    return (
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <QueryBarMenu {...testProps} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  }
  let props: QueryBarMenuProps;
  beforeEach(() => {
    props = {
      language: 'kuery',
      onQueryChange: jest.fn(),
      onQueryBarSubmit: jest.fn(),
      toggleFilterBarMenuPopover: jest.fn(),
      openQueryBarMenu: false,
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
      },
    };
  });
  it('should not render the popover if the openQueryBarMenu prop is false', async () => {
    await act(async () => {
      const component = mount(wrapQueryBarMenuComponentInContext(props, 'kuery'));
      expect(component.find(EuiPopover).prop('isOpen')).toBe(false);
    });
  });

  it('should render the popover if the openQueryBarMenu prop is true', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
    };
    await act(async () => {
      const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
      expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    });
  });

  it('should render the context menu by default', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    expect(component.find('[data-test-subj="queryBarMenuPanel"]')).toBeTruthy();
  });

  it('should render the saved filter sets panels if the showQueryInput prop is true but disabled', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showQueryInput: true,
      showFilterBar: true,
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const saveFilterSetButton = component.find(
      '[data-test-subj="saved-query-management-save-button"]'
    );
    const loadFilterSetButton = component.find(
      '[data-test-subj="saved-query-management-load-button"]'
    );
    expect(saveFilterSetButton.length).toBeTruthy();
    expect(saveFilterSetButton.first().prop('disabled')).toBe(true);
    expect(loadFilterSetButton.length).toBeTruthy();
    expect(loadFilterSetButton.first().prop('disabled')).toBe(true);
  });

  it('should render the filter sets panels if the showFilterBar is true but disabled', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const applyToAllFiltersButton = component.find(
      '[data-test-subj="filter-sets-applyToAllFilters"]'
    );
    const removeAllFiltersButton = component.find(
      '[data-test-subj="filter-sets-removeAllFilters"]'
    );
    expect(applyToAllFiltersButton.length).toBeTruthy();
    expect(applyToAllFiltersButton.first().prop('disabled')).toBe(true);
    expect(removeAllFiltersButton.length).toBeTruthy();
    expect(removeAllFiltersButton.first().prop('disabled')).toBe(true);
  });

  it('should enable the clear all button if query is given', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      query: {
        query: 'category.keyword : "Men\'s Shoes" ',
        language: 'kuery',
      },
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const removeAllFiltersButton = component.find(
      '[data-test-subj="filter-sets-removeAllFilters"]'
    );
    expect(removeAllFiltersButton.first().prop('disabled')).toBe(false);
  });

  it('should enable the apply to all button if filter is given', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: [
        {
          meta: {
            index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'category.keyword',
            params: {
              query: "Men's Accessories",
            },
          },
          query: {
            match_phrase: {
              'category.keyword': "Men's Accessories",
            },
          },
          $state: {
            store: 'appState',
          },
        },
      ] as Filter[],
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const applyToAllFiltersButton = component.find(
      '[data-test-subj="filter-sets-applyToAllFilters"]'
    );
    expect(applyToAllFiltersButton.first().prop('disabled')).toBe(false);
  });

  it('should render the language switcher panel', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      showQueryInput: true,
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const languageSwitcher = component.find('[data-test-subj="switchQueryLanguageButton"]');
    expect(languageSwitcher.length).toBeTruthy();
  });

  it('should render the save query quick buttons', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showSaveQuery: true,
      filters: [
        {
          meta: {
            index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'category.keyword',
            params: {
              query: "Men's Accessories",
            },
          },
          query: {
            match_phrase: {
              'category.keyword': "Men's Accessories",
            },
          },
          $state: {
            store: 'appState',
          },
        },
      ] as Filter[],
      savedQuery: {
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
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const saveChangesButton = component.find(
      '[data-test-subj="saved-query-management-save-changes-button"]'
    );
    expect(saveChangesButton.length).toBeTruthy();
    const saveChangesAsNewButton = component.find(
      '[data-test-subj="saved-query-management-save-as-new-button"]'
    );
    expect(saveChangesAsNewButton.length).toBeTruthy();
  });
});
