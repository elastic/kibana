/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { UnifiedFieldListRestorableState } from '@kbn/unified-field-list';
import type { StoryObj } from '@storybook/react';
import { userEvent, within, expect, fireEvent } from '@storybook/test';
import React from 'react';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { getDataTableRecords } from '../../../../__fixtures__/real_hits';
import type { DiscoverServices } from '../../../..';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import {
  DiscoverSidebarResponsive,
  type DiscoverSidebarResponsiveProps,
} from './discover_sidebar_responsive';
import type { SidebarToggleState } from '../../../types';
import { FetchStatus } from '../../../types';
import type { DataDocuments$ } from '../../state_management/discover_data_state_container';
import { internalStateActions } from '../../state_management/redux';

// Test setup
function createMockServices() {
  const mockServices = {
    ...createDiscoverServicesMock(),
    capabilities: {
      visualize: {
        show: true,
      },
      discover: {
        save: false,
      },
      getState: () => ({
        query: { query: '', language: 'lucene' },
        filters: [],
      }),
    },
    docLinks: { links: { discover: { fieldTypeHelp: '' } } },
  } as unknown as DiscoverServices;
  return mockServices;
}

type TestWrapperProps = DiscoverSidebarResponsiveProps & { selectedDataView: DataView };

function getCompProps(options?: { hits?: DataTableRecord[] }): TestWrapperProps {
  const mockfieldCounts: Record<string, number> = {};

  const dataView = stubLogstashDataView;
  dataView.toSpec = () => ({});

  const hits = options?.hits ?? getDataTableRecords(dataView);

  for (const hit of hits) {
    for (const key of Object.keys(hit.flattened)) {
      mockfieldCounts[key] = (mockfieldCounts[key] || 0) + 1;
    }
  }

  return {
    columns: ['extension'],
    documents$: new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: hits,
    }) as DataDocuments$,
    onChangeDataView: jest.fn(),
    onAddBreakdownField: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedDataView: dataView,
    trackUiMetric: jest.fn(),
    onFieldEdited: jest.fn(),
    onDataViewCreated: jest.fn(),
    sidebarToggleState$: new BehaviorSubject<SidebarToggleState>({
      isCollapsed: false,
      toggle: () => {},
    }),
  };
}

function getStateContainer({
  query,
  fieldListUiState,
}: {
  query?: Query | AggregateQuery;
  fieldListUiState?: Partial<UnifiedFieldListRestorableState>;
}) {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setAppState)({
      appState: {
        query: query ?? { query: '', language: 'lucene' },
        filters: [],
      },
    })
  );
  if (fieldListUiState) {
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.setFieldListUiState)({
        fieldListUiState,
      })
    );
  }
  return stateContainer;
}

const Component = ({
  props,
  appStateParams = {},
  services,
}: {
  props: TestWrapperProps;
  appStateParams?: {
    query?: Query | AggregateQuery;
    fieldListUiState?: Partial<UnifiedFieldListRestorableState>;
  };
  services?: DiscoverServices;
}) => {
  const stateContainer = getStateContainer(appStateParams);
  const mockedServices = services ?? createMockServices();
  mockedServices.data.dataViews.getIdsWithTitle = jest.fn(async () =>
    props.selectedDataView
      ? [{ id: props.selectedDataView.id!, title: props.selectedDataView.title! }]
      : []
  );
  mockedServices.data.dataViews.get = jest.fn().mockImplementation(async (id) => {
    return [props.selectedDataView].find((d) => d!.id === id);
  });
  mockedServices.data.query.getState = jest
    .fn()
    .mockImplementation(() => stateContainer.getCurrentTab().appState);

  return (
    <DiscoverTestProvider
      services={mockedServices}
      stateContainer={stateContainer}
      runtimeState={{
        currentDataView: props.selectedDataView!,
        adHocDataViews: [],
      }}
    >
      <DiscoverSidebarResponsive {...props} />
    </DiscoverTestProvider>
  );
};

// Stories
export default {
  title: 'components/DiscoverSidebarResponsive',
};

interface StoryLoaded {
  services: DiscoverServices;
  props: TestWrapperProps;
  appStateParams?: {
    query?: Query | AggregateQuery;
    fieldListUiState?: Partial<UnifiedFieldListRestorableState>;
  };
}

const pocParameters = {
  a11y: { test: 'off' },
};

export const DataViewWithButtons: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => {
      return {
        services: createMockServices(),
        props: {
          ...getCompProps(),
          fieldListVariant: 'button-and-flyout-always',
          documents$: new BehaviorSubject({
            fetchStatus: FetchStatus.UNINITIALIZED,
          }) as DataDocuments$,
        } as TestWrapperProps,
      };
    },
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ step, canvasElement, loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await step('Open flyout', async () => {
      await userEvent.click(await canvas.findByTestId('discover-sidebar-fields-button'));
    });

    await step('Open data view picker', async () => {
      await userEvent.click(await body.findByTestId('dataView-switch-link'));
      expect(await body.findByTestId('changeDataViewPopover')).toBeInTheDocument();
    });

    await step('Check "Add a field"', async () => {
      expect(await body.findAllByTestId('indexPattern-add-field')).toHaveLength(1);
    });

    await step('Click "Create a data view"', async () => {
      const createDataViewButton = await body.findByTestId('dataview-create-new');
      await userEvent.click(createDataViewButton);
      expect(storyLoaded.services.dataViewEditor.openEditor).toHaveBeenCalled();
    });
  },
};

export const DataViewWithButtonsViewerMode: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => {
      const services = createMockServices();
      services.dataViewEditor.userPermissions.editDataView = jest.fn(() => false);
      services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn(() => false);

      return {
        services,
        props: {
          ...getCompProps(),
          fieldListVariant: 'button-and-flyout-always',
          documents$: new BehaviorSubject({
            fetchStatus: FetchStatus.UNINITIALIZED,
          }) as DataDocuments$,
        } as TestWrapperProps,
      };
    },
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(await canvas.findByTestId('discover-sidebar-fields-button'));
    await userEvent.click(await body.findByTestId('dataView-switch-link'));
    expect(await body.findByTestId('changeDataViewPopover')).toBeInTheDocument();
    expect(body.queryAllByTestId('dataView-add-field')).toHaveLength(0);
    expect(body.queryAllByTestId('dataview-create-new')).toHaveLength(0);
  },
};

export const AddBreakdownField: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => ({
      services: createMockServices(),
      props: getCompProps(),
    }),
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement, loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const availableFields = await canvas.findByTestId('fieldListGroupedAvailableFields');
    await userEvent.click(within(availableFields).getByTestId('field-extension-showDetails'));
    await userEvent.click(
      await body.findByTestId('fieldPopoverHeader_addBreakdownField-extension')
    );
    expect(storyLoaded.props.onAddBreakdownField).toHaveBeenCalled();
  },
};

export const AddFilter: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => ({
      services: createMockServices(),
      props: getCompProps(),
    }),
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement, loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const availableFields = await canvas.findByTestId('fieldListGroupedAvailableFields');
    await userEvent.click(within(availableFields).getByTestId('field-extension-showDetails'));
    const addFilterButton = body.queryByTestId('plus-extension-gif');
    if (addFilterButton) {
      fireEvent.click(addFilterButton);
    } else {
      fireEvent.click(await body.findByTestId('discoverFieldListPanelAddExistFilter-extension'));
    }
    expect(storyLoaded.props.onAddFilter).toHaveBeenCalled();
  },
};

export const AddExistsFilter: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => ({
      services: createMockServices(),
      props: getCompProps(),
    }),
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement, loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const availableFields = await canvas.findByTestId('fieldListGroupedAvailableFields');
    await userEvent.click(within(availableFields).getByTestId('field-extension-showDetails'));
    await userEvent.click(
      await body.findByTestId('discoverFieldListPanelAddExistFilter-extension')
    );
    expect(storyLoaded.props.onAddFilter).toHaveBeenCalledWith('_exists_', 'extension', '+');
  },
};

export const FilterByFieldType: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => ({
      services: createMockServices(),
      props: getCompProps(),
    }),
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('fieldListFiltersFieldTypeFilterToggle'));
    await userEvent.click(await canvas.findByTestId('typeFilter-number'));
    expect(await canvas.findByTestId('fieldListGroupedAvailableFields-count')).toHaveTextContent(
      '3'
    );
  },
};

export const EditFieldButton: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => ({
      services: createMockServices(),
      props: getCompProps(),
    }),
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement, loaded }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const availableFields = await canvas.findByTestId('fieldListGroupedAvailableFields');
    await userEvent.click(within(availableFields).getByTestId('field-bytes'));
    expect(await body.findByTestId('discoverFieldListPanelEdit-bytes')).toBeInTheDocument();
  },
};

export const HideAddEditButtonsInViewerMode: StoryObj = {
  parameters: pocParameters,
  loaders: [
    async () => {
      const services = createMockServices();
      services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn(() => false);

      return {
        services,
        props: getCompProps(),
      };
    },
  ],
  render: (_, { loaded }) => {
    const storyLoaded = loaded as StoryLoaded;
    return <Component props={storyLoaded.props} services={storyLoaded.services} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    expect(canvas.queryAllByTestId('dataView-add-field_btn')).toHaveLength(0);
    const availableFields = await canvas.findByTestId('fieldListGroupedAvailableFields');
    await userEvent.click(within(availableFields).getByTestId('field-bytes'));
    expect(body.queryByTestId('discoverFieldListPanelEdit-bytes')).not.toBeInTheDocument();
  },
};
