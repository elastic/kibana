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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock, applicationServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  SavedQueryManagementListProps,
  SavedQueryManagementList,
} from './saved_query_management_list';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Saved query management list component', () => {
  const startMock = coreMock.createStart();
  const dataMock = dataPluginMock.createStartContract();
  const applicationMock = applicationServiceMock.createStartContract();
  const application = {
    ...applicationMock,
    capabilities: {
      ...applicationMock.capabilities,
      savedObjectsManagement: { edit: true },
    },
  };

  const wrapSavedQueriesListComponentInContext = (
    testProps: SavedQueryManagementListProps,
    applicationService = application
  ) => {
    const services = {
      uiSettings: startMock.uiSettings,
      http: startMock.http,
      application: applicationService,
      notifications: startMock.notifications,
    };

    return (
      <I18nProvider>
        <KibanaContextProvider services={services}>
          <SavedQueryManagementList {...testProps} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  };

  const generateSavedQueries = (total: number) => {
    const queries = [];
    for (let i = 0; i < total; i++) {
      queries.push({
        id: `8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a${i}`,
        attributes: {
          title: `Test ${i}`,
          description: '',
          query: {
            query: 'category.keyword : "Men\'s Shoes" ',
            language: 'kuery',
          },
          filters: [],
        },
        namespaces: ['default'],
      });
    }
    return queries;
  };

  const fooQuery = {
    id: '8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a9',
    attributes: {
      title: 'Foo',
      description: '',
      query: {
        query: 'category.keyword : "Men\'s Shoes" ',
        language: 'kuery',
      },
      filters: [],
    },
    namespaces: ['default'],
  };

  const barQuery = {
    id: '8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a8',
    attributes: {
      title: 'Bar',
      description: '',
      query: {
        query: 'category.keyword : "Men\'s Shoes" ',
        language: 'kuery',
      },
      filters: [],
    },
    namespaces: ['default'],
  };

  const testQuery = {
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
  };

  let props: SavedQueryManagementListProps;

  beforeEach(() => {
    props = {
      onLoad: jest.fn(),
      onClearSavedQuery: jest.fn(),
      onClose: jest.fn(),
      showSaveQuery: true,
      savedQueryService: {
        ...dataMock.query.savedQueries,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 1,
          queries: [testQuery],
        }),
        deleteSavedQuery: jest.fn(),
      },
      queryBarMenuRef: React.createRef(),
    };
  });

  it('should render the list component if saved queries exist', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    expect(await screen.findByRole('listbox', { name: 'Query list' })).toBeInTheDocument();
  });

  it('should not render the list component if saved queries do not exist', async () => {
    const newProps = {
      ...props,
      savedQueryService: {
        ...dataMock.query.savedQueries,
        findSavedQueries: jest.fn().mockResolvedValue({ total: 0, queries: [] }),
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Query list' })).not.toBeInTheDocument();
    });
    expect(screen.queryAllByText(/No saved queries/)[0]).toBeInTheDocument();
  });

  it('should render the saved queries on the selectable component', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    expect(await screen.findAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Test' })).toBeInTheDocument();
  });

  it('should display the total and selected count', async () => {
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 6,
          queries: generateSavedQueries(5),
        }),
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findByText('6 queries')).toBeInTheDocument();
    expect(screen.queryByText('6 queries | 1 selected')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Test 0' }));
    expect(screen.queryByText('6 queries')).not.toBeInTheDocument();
    expect(screen.getByText('6 queries | 1 selected')).toBeInTheDocument();
  });

  it('should not display the "Manage queries" link if application.capabilities.savedObjectsManagement.edit is false', async () => {
    render(
      wrapSavedQueriesListComponentInContext(props, {
        ...application,
        capabilities: {
          ...application.capabilities,
          savedObjectsManagement: { edit: false },
        },
      })
    );
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Manage queries' })).not.toBeInTheDocument();
    });
  });

  it('should display the "Manage queries" link if application.capabilities.savedObjectsManagement.edit is true', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    expect(await screen.findByRole('link', { name: 'Manage queries' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage queries' })).toHaveAttribute(
      'href',
      '/app/management/kibana/objects?initialQuery=type:("query")'
    );
  });

  it('should call the onLoad and onClose function', async () => {
    const onLoadSpy = jest.fn();
    const onCloseSpy = jest.fn();
    const newProps = {
      ...props,
      onLoad: onLoadSpy,
      onClose: onCloseSpy,
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findByLabelText('Load query')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete query' })).toBeDisabled();
    await userEvent.click(screen.getByRole('option', { name: 'Test' }));
    expect(screen.getByLabelText('Load query')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete query' })).toBeEnabled();
    await userEvent.click(screen.getByLabelText('Load query'));
    expect(onLoadSpy).toBeCalled();
    expect(onCloseSpy).toBeCalled();
  });

  it('should render the button with the correct text', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    expect(
      await screen.findByTestId('saved-query-management-apply-changes-button')
    ).toHaveTextContent('Load query');
  });

  it('should not render the delete button if showSaveQuery is false', async () => {
    const newProps = {
      ...props,
      showSaveQuery: false,
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findByLabelText('Load query')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete query' })).not.toBeInTheDocument();
  });

  it('should render the modal on delete', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    await userEvent.click(await screen.findByRole('option', { name: 'Test' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete query' }));
    expect(screen.getByRole('heading', { name: 'Delete "Test"?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByText(/you remove it from every space/)).not.toBeInTheDocument();
  });

  it('should render the modal with warning for multiple namespaces on delete', async () => {
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 1,
          queries: [{ ...testQuery, namespaces: ['one', 'two'] }],
        }),
        deleteSavedQuery: jest.fn(),
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    await userEvent.click(await screen.findByRole('option', { name: 'Test' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete query' }));
    expect(screen.getByRole('heading', { name: 'Delete "Test"?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByText(/you remove it from every space/)).toBeInTheDocument();
  });

  it('should call deleteSavedQuery and onClearSavedQuery on delete of the current selected query', async () => {
    const deleteSavedQuerySpy = jest.fn();
    const onClearSavedQuerySpy = jest.fn();
    const newProps = {
      ...props,
      loadedSavedQuery: testQuery,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 2,
          queries: generateSavedQueries(1),
        }),
        deleteSavedQuery: deleteSavedQuerySpy,
      },
      onClearSavedQuery: onClearSavedQuerySpy,
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findByText('2 queries | 1 selected')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByLabelText('Load query')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete query' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete query' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('1 query')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByLabelText('Load query')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete query' })).toBeDisabled();
    expect(deleteSavedQuerySpy).toHaveBeenLastCalledWith('8a0b7cd0-b0c4-11ec-92b2-73d62e0d28a9');
    expect(onClearSavedQuerySpy).toBeCalled();
  });

  it('should not render pagination if there are less than 5 saved queries', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    await waitFor(() => {
      expect(screen.queryByText(/1 of/)).not.toBeInTheDocument();
    });
  });

  it('should render pagination if there are more than 5 saved queries', async () => {
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 6,
          queries: generateSavedQueries(5),
        }),
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findByText(/1 of 2/)).toBeInTheDocument();
  });

  it('should allow navigating between saved query pages', async () => {
    const findSavedQueriesSpy = jest.fn().mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(5),
    });
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: findSavedQueriesSpy,
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 1);
    });
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
    findSavedQueriesSpy.mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(1),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 2);
    });
    expect(screen.getByText(/2 of 2/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    findSavedQueriesSpy.mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(5),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 1);
    });
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('should not clear the currently selected saved query when navigating between pages', async () => {
    const findSavedQueriesSpy = jest.fn().mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(5),
    });
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: findSavedQueriesSpy,
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 1);
    });
    expect(screen.getByRole('option', { name: 'Test 0', checked: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Test 0' }));
    expect(screen.getByRole('option', { name: 'Test 0', checked: true })).toBeInTheDocument();
    findSavedQueriesSpy.mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(1),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 2);
    });
    findSavedQueriesSpy.mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(5),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 1);
    });
    expect(screen.getByRole('option', { name: 'Test 0', checked: true })).toBeInTheDocument();
  });

  it('should allow providing a search term', async () => {
    const findSavedQueriesSpy = jest.fn().mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(5),
    });
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: findSavedQueriesSpy,
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 1);
    });
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
    findSavedQueriesSpy.mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(1),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 2);
    });
    expect(screen.getByText(/2 of 2/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    findSavedQueriesSpy.mockResolvedValue({
      total: 1,
      queries: generateSavedQueries(1),
    });
    await userEvent.type(screen.getByRole('combobox', { name: 'Query list' }), ' Test And Search ');
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith('Test And Search', 5, 1);
    });
    expect(screen.queryByText(/1 of/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('should correctly handle out of order responses', async () => {
    const completionOrder: number[] = [];
    let triggerResolve = () => {};
    const findSavedQueriesSpy = jest.fn().mockImplementation(async (_, __, page) => {
      let queries: ReturnType<typeof generateSavedQueries> = [];
      if (page === 1) {
        queries = generateSavedQueries(5);
        completionOrder.push(1);
      } else if (page === 2) {
        queries = await new Promise((resolve) => {
          triggerResolve = () => resolve(generateSavedQueries(5));
        });
        completionOrder.push(2);
      } else if (page === 3) {
        queries = generateSavedQueries(1);
        completionOrder.push(3);
      }
      return {
        total: 11,
        queries,
      };
    });
    const newProps = {
      ...props,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: findSavedQueriesSpy,
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    await waitFor(() => {
      expect(completionOrder).toEqual([1]);
    });
    expect(screen.getByText(/1 of 3/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 2);
    });
    expect(completionOrder).toEqual([1]);
    expect(screen.getByText(/2 of 3/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 3);
    });
    expect(completionOrder).toEqual([1, 3]);
    triggerResolve();
    await waitFor(() => {
      expect(completionOrder).toEqual([1, 3, 2]);
    });
    expect(screen.getByText(/3 of 3/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 2);
    });
    expect(completionOrder).toEqual([1, 3, 2]);
    expect(screen.getByText(/2 of 3/)).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 1);
    });
    expect(completionOrder).toEqual([1, 3, 2, 1]);
    triggerResolve();
    await waitFor(() => {
      expect(completionOrder).toEqual([1, 3, 2, 1, 2]);
    });
  });

  it('should not display an "Active" badge if there is no currently loaded saved query', async () => {
    render(wrapSavedQueriesListComponentInContext(props));
    await waitFor(() => {
      expect(screen.queryByText(/Active/)).not.toBeInTheDocument();
    });
  });

  it('should display an "Active" badge for the currently loaded saved query', async () => {
    const newProps = {
      ...props,
      loadedSavedQuery: testQuery,
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findByText(/Active/)).toBeInTheDocument();
  });

  it('should hoist the currently loaded saved query to the top of the list', async () => {
    const newProps = {
      ...props,
      loadedSavedQuery: fooQuery,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 2,
          queries: [barQuery, fooQuery],
        }),
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Foo');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Active');
    expect(screen.getAllByRole('option')[1]).toHaveTextContent('Bar');
    expect(screen.getAllByRole('option')[1]).not.toHaveTextContent('Active');
  });

  it('should hoist the currently loaded saved query to the top of the list even if it is not in the first page of results', async () => {
    const newProps = {
      ...props,
      loadedSavedQuery: fooQuery,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: jest.fn().mockResolvedValue({
          total: 6,
          queries: generateSavedQueries(5),
        }),
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findAllByRole('option')).toHaveLength(6);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Foo');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Active');
    expect(screen.getAllByRole('option')[1]).toHaveTextContent('Test 0');
    expect(screen.getAllByRole('option')[1]).not.toHaveTextContent('Active');
  });

  it('should not hoist the currently loaded saved query to the top of the list if there is a search term', async () => {
    const findSavedQueriesSpy = jest.fn().mockResolvedValue({
      total: 2,
      queries: [barQuery, fooQuery],
    });
    const newProps = {
      ...props,
      loadedSavedQuery: fooQuery,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: findSavedQueriesSpy,
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Foo');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Active');
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Query list' }),
      ' Test And Search '
    );
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith('Test And Search', 5, 1);
    });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Bar');
    expect(screen.getAllByRole('option')[0]).not.toHaveTextContent('Active');
  });

  it('should not hoist the currently loaded saved query to the top of the list if not on the first page', async () => {
    const findSavedQueriesSpy = jest.fn().mockResolvedValue({
      total: 6,
      queries: generateSavedQueries(5),
    });
    const newProps = {
      ...props,
      loadedSavedQuery: fooQuery,
      savedQueryService: {
        ...props.savedQueryService,
        findSavedQueries: findSavedQueriesSpy,
      },
    };
    render(wrapSavedQueriesListComponentInContext(newProps));
    expect(await screen.findAllByRole('option')).toHaveLength(6);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Foo');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Active');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(findSavedQueriesSpy).toHaveBeenLastCalledWith(undefined, 5, 2);
    });
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Test 0');
    expect(screen.getAllByRole('option')[0]).not.toHaveTextContent('Active');
  });
});
