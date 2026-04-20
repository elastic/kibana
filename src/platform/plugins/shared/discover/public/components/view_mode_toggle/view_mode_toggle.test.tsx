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
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    renderWithKibanaRenderContext(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DocumentViewModeToggle
          viewMode={viewMode}
          isEsqlMode={isEsqlMode}
          setDiscoverViewMode={setDiscoverViewMode}
          dataView={dataView}
        />
      </DiscoverToolkitTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();
    });

    return { setDiscoverViewMode };
  };

  it('should render if SHOW_FIELD_STATISTICS is true', async () => {
    await renderComponent();

    expect(screen.getByTestId('dscViewModeToggle')).toBeVisible();
    expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();

    expect(screen.getByTestId('dscViewModeDocumentButton')).toBeVisible();
    expect(screen.getByTestId('dscViewModePatternAnalysisButton')).toBeVisible();
    expect(screen.getByTestId('dscViewModeFieldStatsButton')).toBeVisible();
    expect(screen.getByTestId('dscViewModeDocumentButton')).toHaveTextContent('Documents (10)');
  });

  it('should not render if SHOW_FIELD_STATISTICS is false', async () => {
    await renderComponent({ showFieldStatistics: false });

    expect(screen.getByTestId('dscViewModeToggle')).toBeVisible();
    expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();

    expect(screen.getByTestId('dscViewModeDocumentButton')).toBeVisible();
    expect(screen.getByTestId('dscViewModePatternAnalysisButton')).toBeVisible();
    expect(screen.queryByTestId('dscViewModeFieldStatsButton')).not.toBeInTheDocument();
  });

  it('should not show document and field stats view if ES|QL', async () => {
    await renderComponent({ isEsqlMode: true });

    expect(screen.queryByTestId('dscViewModeToggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverQueryTotalHits')).toBeVisible();

    expect(screen.queryByTestId('dscViewModeDocumentButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscViewModePatternAnalysisButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dscViewModeFieldStatsButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('10');
  });

  it('should set the view mode to VIEW_MODE.DOCUMENT_LEVEL when dscViewModeDocumentButton is clicked', async () => {
    const setDiscoverViewMode = jest.fn();
    const user = userEvent.setup();

    await renderComponent({ setDiscoverViewMode });
    await user.click(screen.getByTestId('dscViewModeDocumentButton'));

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.DOCUMENT_LEVEL);
  });

  it('should set the view mode to VIEW_MODE.PATTERN_LEVEL when dscViewModePatternAnalysisButton is clicked', async () => {
    const setDiscoverViewMode = jest.fn();
    const user = userEvent.setup();

    await renderComponent({ setDiscoverViewMode });
    await user.click(screen.getByTestId('dscViewModePatternAnalysisButton'));

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.PATTERN_LEVEL);
  });

  it('should set the view mode to VIEW_MODE.AGGREGATED_LEVEL when dscViewModeFieldStatsButton is clicked', async () => {
    const setDiscoverViewMode = jest.fn();
    const user = userEvent.setup();

    await renderComponent({ setDiscoverViewMode });
    await user.click(screen.getByTestId('dscViewModeFieldStatsButton'));

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.AGGREGATED_LEVEL);
  });

  it('should select the Documents tab if viewMode is VIEW_MODE.DOCUMENT_LEVEL', async () => {
    await renderComponent();

    expect(screen.getByTestId('dscViewModeDocumentButton')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('should select the Pattern Analysis tab if viewMode is VIEW_MODE.PATTERN_LEVEL', async () => {
    await renderComponent({ viewMode: VIEW_MODE.PATTERN_LEVEL });

    expect(screen.getByTestId('dscViewModePatternAnalysisButton')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('should select the Field statistics tab if viewMode is VIEW_MODE.AGGREGATED_LEVEL', async () => {
    await renderComponent({ viewMode: VIEW_MODE.AGGREGATED_LEVEL });

    expect(screen.getByTestId('dscViewModeFieldStatsButton')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('should switch to document and hide pattern tab when there are no text fields', async () => {
    const setDiscoverViewMode = jest.fn();

    await renderComponent({
      viewMode: VIEW_MODE.PATTERN_LEVEL,
      useDataViewWithTextFields: false,
      setDiscoverViewMode,
    });

    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.DOCUMENT_LEVEL, true);
    await waitFor(() => {
      expect(screen.queryByTestId('dscViewModePatternAnalysisButton')).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
