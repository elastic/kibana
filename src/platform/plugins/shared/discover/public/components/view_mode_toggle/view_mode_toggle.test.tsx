/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE } from '../../../common/constants';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { MutableRefObject } from 'react';
import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { DocumentViewModeToggle } from './view_mode_toggle';
import { getDiscoverInternalStateMock } from '../../__mocks__/discover_state.mock';
import { FetchStatus } from '../../application/types';
import { DiscoverToolkitTestProvider } from '../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';

describe('Document view mode toggle component', () => {
  const renderComponent = async ({
    showFieldStatistics = true,
    viewMode = VIEW_MODE.DOCUMENT_LEVEL,
    isEsqlMode = false,
    setDiscoverViewMode = jest.fn(),
    useDataViewWithTextFields = true,
    focusOnMountRef = { current: false },
  } = {}) => {
    const services = createDiscoverServicesMock();

    services.uiSettings.get = jest.fn().mockReturnValue(showFieldStatistics);
    services.aiops!.getPatternAnalysisAvailable = jest
      .fn()
      .mockResolvedValue(jest.fn(() => useDataViewWithTextFields));

    const dataView = buildDataViewMock({ name: 'logs-*' });

    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();

    const { dataStateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    dataStateContainer.data$.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 10,
    });

    const { unmount } = renderWithKibanaRenderContext(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DocumentViewModeToggle
          viewMode={viewMode}
          isEsqlMode={isEsqlMode}
          setDiscoverViewMode={setDiscoverViewMode}
          dataView={dataView}
          focusOnMountRef={focusOnMountRef}
        />
      </DiscoverToolkitTestProvider>
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('dscViewModeToggleButton') ??
          screen.queryByTestId('discoverQueryTotalHits')
      ).toBeVisible();
    });

    return { setDiscoverViewMode, unmount };
  };

  const openSelector = () => {
    act(() => {
      screen.getByTestId('dscViewModeToggleButton').click();
    });
  };

  it('should render if SHOW_FIELD_STATISTICS is true', async () => {
    await renderComponent();

    expect(screen.getByTestId('dscViewModeToggleButton')).toBeVisible();
    expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();
    expect(screen.getByTestId('dscViewModeToggleButton')).toHaveTextContent('View as');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('10 documents');

    openSelector();

    expect(screen.getByRole('option', { name: /Documents/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Patterns/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Field statistics/ })).toBeInTheDocument();
  });

  it('should not render field statistics option if SHOW_FIELD_STATISTICS is false', async () => {
    await renderComponent({ showFieldStatistics: false });

    expect(screen.getByTestId('dscViewModeToggleButton')).toBeVisible();
    expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();

    openSelector();

    expect(screen.getByRole('option', { name: /Documents/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Patterns/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Field statistics/ })).not.toBeInTheDocument();
  });

  it('should not show the selector if ES|QL', async () => {
    await renderComponent({ isEsqlMode: true });

    expect(screen.queryByTestId('dscViewModeToggleButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('10');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('10 results');
  });

  it('should set the view mode to VIEW_MODE.DOCUMENT_LEVEL when the Documents option is clicked', async () => {
    const setDiscoverViewMode = jest.fn();

    await renderComponent({ setDiscoverViewMode, viewMode: VIEW_MODE.PATTERN_LEVEL });
    openSelector();
    act(() => {
      screen.getByRole('option', { name: /Documents/ }).click();
    });

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.DOCUMENT_LEVEL);
  });

  it('should set the view mode to VIEW_MODE.PATTERN_LEVEL when the Patterns option is clicked', async () => {
    const setDiscoverViewMode = jest.fn();

    await renderComponent({ setDiscoverViewMode });
    openSelector();
    act(() => {
      screen.getByRole('option', { name: /Patterns/ }).click();
    });

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.PATTERN_LEVEL);
  });

  it('should set the view mode to VIEW_MODE.AGGREGATED_LEVEL when the Field statistics option is clicked', async () => {
    const setDiscoverViewMode = jest.fn();

    await renderComponent({ setDiscoverViewMode });
    openSelector();
    act(() => {
      screen.getByRole('option', { name: /Field statistics/ }).click();
    });

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.AGGREGATED_LEVEL);
  });

  it('should select the Documents option if viewMode is VIEW_MODE.DOCUMENT_LEVEL', async () => {
    await renderComponent();

    expect(screen.getByTestId('dscViewModeToggleButton')).toHaveAttribute(
      'data-selected-value',
      VIEW_MODE.DOCUMENT_LEVEL
    );
  });

  it('should select the Patterns option if viewMode is VIEW_MODE.PATTERN_LEVEL', async () => {
    await renderComponent({ viewMode: VIEW_MODE.PATTERN_LEVEL });

    expect(screen.getByTestId('dscViewModeToggleButton')).toHaveAttribute(
      'data-selected-value',
      VIEW_MODE.PATTERN_LEVEL
    );
  });

  it('should select the Field statistics option if viewMode is VIEW_MODE.AGGREGATED_LEVEL', async () => {
    await renderComponent({ viewMode: VIEW_MODE.AGGREGATED_LEVEL });

    expect(screen.getByTestId('dscViewModeToggleButton')).toHaveAttribute(
      'data-selected-value',
      VIEW_MODE.AGGREGATED_LEVEL
    );
  });

  it('should disable the Field statistics option when in ES|QL mode with an aggregated view already selected', async () => {
    await renderComponent({ isEsqlMode: true, viewMode: VIEW_MODE.AGGREGATED_LEVEL });

    openSelector();

    expect(screen.getByRole('option', { name: /Field statistics/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('should render a loading spinner for the pattern count until it is provided', async () => {
    await renderComponent({ viewMode: VIEW_MODE.PATTERN_LEVEL });

    expect(screen.queryByTestId('dscViewModePatternCount')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeVisible();
    expect(screen.getByText('patterns')).toBeVisible();
  });

  it('should flag focusOnMountRef when an option is selected, and focus the button that consumes it on mount', async () => {
    const focusOnMountRef: MutableRefObject<boolean> = { current: false };
    const { unmount } = await renderComponent({ focusOnMountRef });

    openSelector();
    act(() => {
      screen.getByRole('option', { name: /Patterns/ }).click();
    });

    expect(focusOnMountRef.current).toBe(true);

    unmount();
    await renderComponent({ viewMode: VIEW_MODE.PATTERN_LEVEL, focusOnMountRef });

    expect(screen.getByTestId('dscViewModeToggleButton')).toHaveFocus();
    expect(focusOnMountRef.current).toBe(false);
  });

  it('should switch to document and hide pattern option when there are no text fields', async () => {
    const setDiscoverViewMode = jest.fn();

    await renderComponent({
      viewMode: VIEW_MODE.PATTERN_LEVEL,
      useDataViewWithTextFields: false,
      setDiscoverViewMode,
    });

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.DOCUMENT_LEVEL, true);
    await waitFor(() => {
      expect(screen.getByTestId('dscViewModeToggleButton')).toBeVisible();
    });

    openSelector();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('option', { name: /Patterns/ })).not.toBeInTheDocument();
  });

  it('should not show Pattern Analysis option when aiops service is unavailable (basic license)', async () => {
    const services = createDiscoverServicesMock();

    services.uiSettings.get = jest.fn().mockReturnValue(true); // showFieldStatistics = true
    services.aiops = undefined; // Simulate basic license - aiops not available

    const dataView = buildDataViewMock({ name: 'logs-*' });
    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();

    const { dataStateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    dataStateContainer.data$.totalHits$.next({
      fetchStatus: FetchStatus.COMPLETE,
      result: 10,
    });

    renderWithKibanaRenderContext(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DocumentViewModeToggle
          viewMode={VIEW_MODE.DOCUMENT_LEVEL}
          isEsqlMode={false}
          setDiscoverViewMode={jest.fn()}
          dataView={dataView}
          focusOnMountRef={{ current: false }}
        />
      </DiscoverToolkitTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();
    });

    expect(screen.getByTestId('dscViewModeToggleButton')).toBeVisible();
    openSelector();
    expect(screen.queryByRole('option', { name: /Patterns/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Field statistics/ })).toBeInTheDocument();
  });
});
