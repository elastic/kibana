/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React from 'react';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { generateFilters } from '@kbn/data-plugin/public';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import { ContextAppRoute } from './context_app_route';
import { useDataView } from '../../hooks/use_data_view';
import { useRootProfile } from '../../context_awareness/hooks/use_root_profile';
import type { ContextAppProps } from './context_app';
import { popularizeField } from '@kbn/unified-data-table';
import { type ContextAwarenessToolkit } from '../../context_awareness';
import { TEST_PROFILE_STATE_DEF } from '../../context_awareness/__mocks__/profile_state';

let mockContextAppProps: ContextAppProps | undefined;

vi.mock('./context_app', () => {
  const mocked = {
    ContextApp: (props: ContextAppProps) => {
      mockContextAppProps = props;
      return null;
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_data_view', () => {
  const mocked = {
    useDataView: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../context_awareness/hooks/use_root_profile', () => {
  const mocked = {
    useRootProfile: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/unified-data-table', async () => {
  const actual = await vi.importActual('@kbn/unified-data-table');
  return {
    ...actual,
    popularizeField: vi.fn(actual.popularizeField),
  };
});

describe('ContextAppRoute', () => {
  const useDataViewMock = vi.mocked(useDataView);
  const useRootProfileMock = vi.mocked(useRootProfile);
  const popularizeFieldSpy = vi.mocked(popularizeField);

  beforeEach(() => {
    mockContextAppProps = undefined;
    vi.clearAllMocks();
    useDataViewMock.mockReturnValue({ dataView: dataViewMock, error: undefined });
    useRootProfileMock.mockReturnValue({
      rootProfileLoading: false,
      getDefaultAdHocDataViews: () => [],
      getDefaultEsqlQuery: () => undefined,
    });
  });

  const renderContextAppRoute = (services = createDiscoverServicesMock()) => {
    render(
      <DiscoverTestProvider services={services}>
        <MemoryRouter initialEntries={['/context/test-data-view/test-anchor-id']}>
          <Route path="/context/:dataViewId/:id">
            <ContextAppRoute />
          </Route>
        </MemoryRouter>
      </DiscoverTestProvider>
    );

    return { services, props: mockContextAppProps! };
  };

  it('provides an in-memory profile state toolkit', () => {
    const services = createDiscoverServicesMock();
    const originalCreateScopedProfilesManager =
      services.profilesManager.createScopedProfilesManager.bind(services.profilesManager);
    let capturedToolkit: ContextAwarenessToolkit | undefined;

    services.profileStateRegistry.registerDefinition(TEST_PROFILE_STATE_DEF);
    vi.spyOn(services.profilesManager, 'createScopedProfilesManager').mockImplementation((args) => {
      capturedToolkit = args.toolkit;
      return originalCreateScopedProfilesManager(args);
    });

    renderContextAppRoute(services);

    if (!capturedToolkit) {
      throw new Error('Expected ContextAppRoute to create a scoped profiles manager.');
    }

    const stateAdapter = capturedToolkit.getStateAdapter(TEST_PROFILE_STATE_DEF);
    expect(stateAdapter.getState()).toEqual(TEST_PROFILE_STATE_DEF.defaultState);

    stateAdapter.setState({ ...TEST_PROFILE_STATE_DEF.defaultState, uiValue: 'primary' });
    stateAdapter.updateState({ uiValue: 'success' });

    expect(stateAdapter.getState()).toEqual({
      ...TEST_PROFILE_STATE_DEF.defaultState,
      uiValue: 'success',
    });
  });

  it('dispatches addFilter side effects', () => {
    const services = createDiscoverServicesMock();
    const scopedEbtManager = services.ebtManager.createScopedEBTManager();

    vi.spyOn(services.ebtManager, 'createScopedEBTManager').mockReturnValue(scopedEbtManager);

    const trackFilterAdditionSpy = vi.spyOn(scopedEbtManager, 'trackFilterAddition');
    const addFiltersSpy = vi.spyOn(services.filterManager, 'addFilters');
    const { props } = renderContextAppRoute(services);
    const expectedFilters = generateFilters(
      services.filterManager,
      'message',
      'foo',
      '+',
      dataViewMock
    );

    act(() => {
      props.addFilter('message', 'foo', '+');
    });

    expect(addFiltersSpy).toHaveBeenCalledWith(expectedFilters);
    expect(popularizeFieldSpy).toHaveBeenCalledWith(
      dataViewMock,
      'message',
      services.dataViews,
      services.capabilities
    );
    expect(trackFilterAdditionSpy).toHaveBeenCalledWith({
      fieldName: 'message',
      filterOperation: '+',
      fieldsMetadata: services.fieldsMetadata,
    });
  });

  it('tracks _exists_ filter additions with correct operation and field name', () => {
    const services = createDiscoverServicesMock();
    const scopedEbtManager = services.ebtManager.createScopedEBTManager();

    vi.spyOn(services.ebtManager, 'createScopedEBTManager').mockReturnValue(scopedEbtManager);

    const trackFilterAdditionSpy = vi.spyOn(scopedEbtManager, 'trackFilterAddition');
    const addFiltersSpy = vi.spyOn(services.filterManager, 'addFilters');
    const { props } = renderContextAppRoute(services);
    const expectedFilters = generateFilters(
      services.filterManager,
      '_exists_',
      'host.name',
      '+',
      dataViewMock
    );

    act(() => {
      props.addFilter('_exists_', 'host.name', '+');
    });

    expect(addFiltersSpy).toHaveBeenCalledWith(expectedFilters);
    expect(popularizeFieldSpy).toHaveBeenCalledWith(
      dataViewMock,
      '_exists_',
      services.dataViews,
      services.capabilities
    );
    expect(trackFilterAdditionSpy).toHaveBeenCalledWith({
      fieldName: 'host.name',
      filterOperation: '_exists_',
      fieldsMetadata: services.fieldsMetadata,
    });
  });
});
