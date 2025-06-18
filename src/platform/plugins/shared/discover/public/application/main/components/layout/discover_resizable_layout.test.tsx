/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { findTestSubject } from '@kbn/test-jest-helpers';
import { mount, type ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { isEqual as mockIsEqual } from 'lodash';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverResizableLayout, SIDEBAR_WIDTH_KEY } from './discover_resizable_layout';
import { BehaviorSubject } from 'rxjs';
import type { SidebarToggleState } from '../../../types';
import type { DiscoverSidebarResponsiveProps } from '../sidebar/discover_sidebar_responsive';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { savedSearchMockWithTimeField } from '../../../../__mocks__/saved_search';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { TabsPortalsRenderer } from '../portals/tabs_portals_renderer';
import {
  internalStateActions,
  InternalStateProvider,
  RuntimeStateProvider,
} from '../../state_management/redux';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const mockSidebarKey = SIDEBAR_WIDTH_KEY;
let mockSidebarWidth: number | undefined;
const mockSidebarProps: DiscoverSidebarResponsiveProps['sidebarProps'] = {
  columns: ['extension', 'message'],
  onChangeDataView: jest.fn(),
  onDataViewCreated: jest.fn(),
  onAddField: jest.fn(),
  onRemoveField: jest.fn(),
  onAddFilter: jest.fn(),
  onFieldEdited: jest.fn(),
  onAddBreakdownField: jest.fn(),
  trackUiMetric: jest.fn(),
  fieldListVariant: 'list-always',
  sidebarToggleState$: new BehaviorSubject<SidebarToggleState>({
    isCollapsed: false,
    toggle: () => {},
  }),
};

jest.mock('react-use/lib/useLocalStorage', () => {
  return jest.fn((key: string, initialValue: number) => {
    if (key === 'discover.unifiedFieldList.initiallyOpenSections') {
      return [initialValue, jest.fn()];
    }
    if (key !== mockSidebarKey) {
      throw new Error(`Unexpected key: ${key}`);
    }
    return [mockSidebarWidth ?? initialValue, jest.fn()];
  });
});

let mockIsMobile = false;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: jest.fn((breakpoints: string[]) => {
      if (!mockIsEqual(breakpoints, ['xs', 's'])) {
        throw new Error(`Unexpected breakpoints: ${breakpoints}`);
      }
      return mockIsMobile;
    }),
  };
});

/**
 * Helper function to render DiscoverResizableLayout component for testing
 */
const renderDiscoverResizableLayout = async (options: {
  isCollapsed?: boolean;
  mainPanel?: React.ReactNode;
}): Promise<ReactWrapper> => {
  const { isCollapsed = false } = options;

  const sidebarProps = {
    ...mockSidebarProps,
    sidebarToggleState$: new BehaviorSubject<SidebarToggleState>({
      isCollapsed,
      toggle: () => {},
    }),
  };
  const stateContainer = getDiscoverStateMock({
    isTimeBased: true,
    savedSearch: savedSearchMockWithTimeField,
  });
  const dataView = savedSearchMockWithTimeField?.searchSource?.getField('index') as DataView;
  const appState = {
    dataSource: createDataViewDataSource({ dataViewId: dataView?.id! }),
    interval: 'auto',
    hideChart: false,
  };

  stateContainer.appState.update(appState);

  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataView)({ dataView })
  );

  const component = mount(
    <KibanaContextProvider services={discoverServiceMock}>
      <InternalStateProvider store={stateContainer.internalState}>
        <TabsPortalsRenderer runtimeStateManager={stateContainer.runtimeStateManager}>
          <RuntimeStateProvider currentDataView={dataView} adHocDataViews={[]}>
            <DiscoverResizableLayout
              container={null}
              sidebarToggleState$={
                new BehaviorSubject<SidebarToggleState>({
                  isCollapsed,
                  toggle: () => {},
                })
              }
              sidebarProps={sidebarProps}
              mainPanel={<div data-test-subj="mainPanel" />}
            />
          </RuntimeStateProvider>
        </TabsPortalsRenderer>
      </InternalStateProvider>
    </KibanaContextProvider>
  );

  // wait for lazy modules
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  await act(async () => {
    component.update();
  });
  return component;
};

describe('DiscoverResizableLayout', () => {
  beforeEach(() => {
    mockSidebarWidth = undefined;
    mockIsMobile = false;
  });

  it('should render sidebarPanel and mainPanel', async () => {
    const wrapper = await renderDiscoverResizableLayout({
      isCollapsed: true,
    });
    expect(findTestSubject(wrapper, 'discover-sidebar')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'mainPanel')).toHaveLength(1);
  });

  it('should use the default sidebar width when no value is stored in local storage', async () => {
    const wrapper = await renderDiscoverResizableLayout({
      isCollapsed: true,
    });
    expect(wrapper.find(ResizableLayout).prop('fixedPanelSize')).toBe(304);
  });

  it('should use the stored sidebar width from local storage', async () => {
    mockSidebarWidth = 400;
    const wrapper = await renderDiscoverResizableLayout({
      isCollapsed: true,
    });
    expect(wrapper.find(ResizableLayout).prop('fixedPanelSize')).toBe(400);
  });

  it('should pass mode ResizableLayoutMode.Resizable when not mobile and sidebar is not collapsed', async () => {
    mockIsMobile = false;
    const wrapper = await renderDiscoverResizableLayout({});
    expect(wrapper.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Resizable);
  });

  it('should pass mode ResizableLayoutMode.Static when mobile', async () => {
    mockIsMobile = true;
    const wrapper = await renderDiscoverResizableLayout({});
    expect(wrapper.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Static);
  });

  it('should pass mode ResizableLayoutMode.Static when not mobile and sidebar is collapsed', async () => {
    mockIsMobile = false;
    const wrapper = await renderDiscoverResizableLayout({ isCollapsed: true });
    expect(wrapper.find(ResizableLayout).prop('mode')).toBe(ResizableLayoutMode.Static);
  });

  it('should pass direction ResizableLayoutDirection.Horizontal when not mobile', async () => {
    mockIsMobile = false;
    const wrapper = await renderDiscoverResizableLayout({});
    expect(wrapper.find(ResizableLayout).prop('direction')).toBe(
      ResizableLayoutDirection.Horizontal
    );
  });

  it('should pass direction ResizableLayoutDirection.Vertical when mobile', async () => {
    mockIsMobile = true;
    const wrapper = await renderDiscoverResizableLayout({});
    expect(wrapper.find(ResizableLayout).prop('direction')).toBe(ResizableLayoutDirection.Vertical);
  });
});
