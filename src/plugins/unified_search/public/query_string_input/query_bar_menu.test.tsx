/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/react';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
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

  const filtersMock = [
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
  ] as Filter[];

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
      application: {
        ...startMock.application,
        capabilities: {
          ...startMock.application.capabilities,
          savedQueryManagement: {
            showQueries: true,
            saveQuery: true,
          },
        },
      },
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
      onCloseFilterPopover: jest.fn(),
      onLocalFilterUpdate: jest.fn(),
      onLocalFilterCreate: jest.fn(),
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
      additionalQueryBarMenuItems: {},
      queryBarMenuRef: React.createRef(),
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

  it('should render the saved saved queries panels if the showQueryInput prop is true but disabled', async () => {
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

  it('should render the saved queries panels if the showFilterBar is true but disabled', async () => {
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
      filters: filtersMock,
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

  it('should render the save query quick button', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showSaveQuery: true,
      filters: filtersMock,
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
        namespaces: ['default'],
      },
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    const saveChangesButton = component.find(
      '[data-test-subj="saved-query-management-save-changes-button"]'
    );
    expect(saveChangesButton.length).toBeTruthy();
  });

  it('should render all filter panel options by default', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: undefined,
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    expect(component.find('[data-test-subj="filter-sets-removeAllFilters"]').length).toBeTruthy();
    component.find('[data-test-subj="filter-sets-applyToAllFilters"]').first().simulate('click');

    await waitFor(() => {
      component.update();
      expect(component.find('[data-test-subj="contextMenuPanelTitleButton"]').length).toBeTruthy();
    });

    expect(component.find('[data-test-subj="filter-sets-pinAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-unpinAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-invertAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-disableAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-enableAllFilters"]').length).toBeTruthy();
  });

  it('should hide pinning filter panel options', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: ['pinFilter'],
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    component.find('[data-test-subj="filter-sets-applyToAllFilters"]').first().simulate('click');

    await waitFor(() => {
      component.update();
      expect(component.find('[data-test-subj="contextMenuPanelTitleButton"]').length).toBeTruthy();
    });

    expect(component.find('[data-test-subj="filter-sets-pinAllFilters"]').length).toBeFalsy();
    expect(component.find('[data-test-subj="filter-sets-unpinAllFilters"]').length).toBeFalsy();

    expect(component.find('[data-test-subj="filter-sets-invertAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-disableAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-enableAllFilters"]').length).toBeTruthy();
  });

  it('should hide negating and enabling filter panel options', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: ['negateFilter', 'disableFilter'],
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    component.find('[data-test-subj="filter-sets-applyToAllFilters"]').first().simulate('click');

    await waitFor(() => {
      component.update();
      expect(component.find('[data-test-subj="contextMenuPanelTitleButton"]').length).toBeTruthy();
    });

    expect(component.find('[data-test-subj="filter-sets-pinAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-unpinAllFilters"]').length).toBeTruthy();
    expect(component.find('[data-test-subj="filter-sets-invertAllFilters"]').length).toBeFalsy();
    expect(component.find('[data-test-subj="filter-sets-disableAllFilters"]').length).toBeFalsy();
    expect(component.find('[data-test-subj="filter-sets-enableAllFilters"]').length).toBeFalsy();
  });

  it('should hide deleting filter panel options', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: ['deleteFilter'],
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    expect(component.find('[data-test-subj="filter-sets-removeAllFilters"]').length).toBeFalsy();
  });

  it('should render additional menu items', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      additionalQueryBarMenuItems: {
        items: [
          {
            name: 'Test additional query bar menu item',
            'data-test-subj': 'additional-query-bar-menu-item',
          },
        ],
      },
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    expect(component.find('[data-test-subj="additional-query-bar-menu-item"]').length).toBeTruthy();
  });

  it('should render additional menu panels', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      additionalQueryBarMenuItems: {
        items: [
          {
            name: 'Go to nested menu',
            'data-test-subj': 'additional-query-bar-menu-panel-link',
            panel: 'panel-1',
          },
        ],
        panels: [
          {
            id: 'panel-1',
            title: 'Grouped additional query bar menu items',
            items: [
              {
                name: 'Test additional query bar menu item',
                'data-test-subj': 'additional-query-bar-nested-menu-item',
              },
            ],
          },
        ],
      },
    };
    const component = mount(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    component
      .find('[data-test-subj="additional-query-bar-menu-panel-link"]')
      .first()
      .simulate('click');

    await waitFor(() => {
      component.update();
      expect(
        component.find('[data-test-subj="additional-query-bar-nested-menu-item"]').length
      ).toBeTruthy();
    });
  });
});
