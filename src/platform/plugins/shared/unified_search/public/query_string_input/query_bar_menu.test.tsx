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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { Filter } from '@kbn/es-query';
import type { QueryBarMenuProps } from './query_bar_menu';
import { QueryBarMenu } from './query_bar_menu';

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

  it.each([
    {
      openQueryBarMenu: false,
      shouldRender: false,
      description: 'should not render the popover if the openQueryBarMenu prop is false',
    },
    {
      openQueryBarMenu: true,
      shouldRender: true,
      description: 'should render the popover if the openQueryBarMenu prop is true',
    },
  ])('$description', async ({ openQueryBarMenu, shouldRender }) => {
    const newProps = {
      ...props,
      openQueryBarMenu,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));
    expect(screen.getByTestId('queryBarMenuPopover')).toBeInTheDocument();
    if (shouldRender) {
      await waitFor(() => {
        expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
      });
    } else {
      await waitFor(() => {
        expect(screen.queryByTestId('queryBarMenuPanel')).not.toBeInTheDocument();
      });
    }
  });

  it('should render the context menu by default', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    await waitFor(() => {
      expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
    });
  });

  it('should render the saved saved queries panels if the showQueryInput prop is true but disabled', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showQueryInput: true,
      showFilterBar: true,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    const saveFilterSetButton = screen.getByTestId('saved-query-management-save-button');
    const loadFilterSetButton = screen.getByTestId('saved-query-management-load-button');

    expect(saveFilterSetButton).toBeInTheDocument();
    expect(saveFilterSetButton).toBeDisabled();
    expect(loadFilterSetButton).toBeInTheDocument();
    expect(loadFilterSetButton).toBeDisabled();
  });

  it('should render the saved queries panels if the showFilterBar is true but disabled', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    const applyToAllFiltersButton = screen.getByTestId('filter-sets-applyToAllFilters');
    const removeAllFiltersButton = screen.getByTestId('filter-sets-removeAllFilters');

    expect(applyToAllFiltersButton).toBeDisabled();
    expect(removeAllFiltersButton).toBeDisabled();
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

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    const removeAllFiltersButton = screen.getByTestId('filter-sets-removeAllFilters');
    expect(removeAllFiltersButton).not.toBeDisabled();
  });

  it('should enable the apply to all button if filter is given', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    const applyToAllFiltersButton = screen.getByTestId('filter-sets-applyToAllFilters');
    expect(applyToAllFiltersButton).not.toBeDisabled();
  });

  it('should render the language switcher panel', async () => {
    const newProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      showQueryInput: true,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    const languageSwitcher = screen.getByTestId('switchQueryLanguageButton');
    expect(languageSwitcher).toBeInTheDocument();
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

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    const saveChangesButton = screen.getByTestId('saved-query-management-save-changes-button');
    expect(saveChangesButton).toBeInTheDocument();
  });

  it('should render all filter panel options by default', async () => {
    const user = userEvent.setup();
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: undefined,
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
    expect(screen.getByTestId('filter-sets-removeAllFilters')).toBeInTheDocument();

    await user.click(screen.getByTestId('filter-sets-applyToAllFilters'));

    await waitFor(() => {
      expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-pinAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-unpinAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-invertAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-disableAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-enableAllFilters')).toBeInTheDocument();
    });
  });

  it('should hide pinning filter panel options', async () => {
    const user = userEvent.setup();
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: ['pinFilter'],
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    await user.click(screen.getByTestId('filter-sets-applyToAllFilters'));

    await waitFor(() => {
      expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
      expect(screen.queryByTestId('filter-sets-pinAllFilters')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-sets-unpinAllFilters')).not.toBeInTheDocument();

      expect(screen.getByTestId('filter-sets-invertAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-disableAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-enableAllFilters')).toBeInTheDocument();
    });
  });

  it('should hide negating and enabling filter panel options', async () => {
    const user = userEvent.setup();
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: ['negateFilter', 'disableFilter'],
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    await user.click(screen.getByTestId('filter-sets-applyToAllFilters'));

    await waitFor(() => {
      expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-pinAllFilters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-sets-unpinAllFilters')).toBeInTheDocument();
      expect(screen.queryByTestId('filter-sets-invertAllFilters')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-sets-disableAllFilters')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-sets-enableAllFilters')).not.toBeInTheDocument();
    });
  });

  it('should hide deleting filter panel options', async () => {
    const newProps: QueryBarMenuProps = {
      ...props,
      openQueryBarMenu: true,
      showFilterBar: true,
      filters: filtersMock,
      hiddenPanelOptions: ['deleteFilter'],
    };

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    await waitFor(() => {
      expect(screen.getByTestId('queryBarMenuPanel')).toBeInTheDocument();
      expect(screen.queryByTestId('filter-sets-removeAllFilters')).not.toBeInTheDocument();
    });
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

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    await waitFor(() => {
      expect(screen.getByTestId('additional-query-bar-menu-item')).toBeInTheDocument();
    });
  });

  it('should render additional menu panels', async () => {
    const user = userEvent.setup();
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

    render(wrapQueryBarMenuComponentInContext(newProps, 'kuery'));

    await user.click(screen.getByTestId('additional-query-bar-menu-panel-link'));

    await waitFor(() => {
      expect(screen.getByTestId('additional-query-bar-nested-menu-item')).toBeInTheDocument();
    });
  });
});
