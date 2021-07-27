/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { IndexPattern } from '../../../../../kibana_services';
import { SavedSearch } from '../../../../../saved_searches';
import { DiscoverServices } from '../../../../../build_services';
import { GetStateReturn } from '../../services/discover_state';
import { DiscoverDataVisualizerGrid } from '../../../../components/data_visualizer_grid';
import { SAMPLE_SIZE_SETTING } from '../../../../../../common';

const DataVisualizerGridPanelMemoized = React.memo(DiscoverDataVisualizerGrid);

interface DataVisualizerPanelProps {
  onClose: () => void;
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: GetStateReturn;
}

export function DataVisualizerPanel({
  onClose,
  savedSearch,
  services,
  indexPattern,
  state,
}: DataVisualizerPanelProps) {
  const { uiSettings } = services;
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);
  const appState = state.appStateContainer.getState();

  return (
    <EuiFlyout ownFocus onClose={onClose} data-test-subj="loadSearchForm">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.openSearchTitle"
              defaultMessage="Data visualizer"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DataVisualizerGridPanelMemoized
          savedSearch={savedSearch}
          services={services}
          indexPattern={indexPattern}
          searchDescription={savedSearch.description}
          searchTitle={savedSearch.lastSavedTitle}
          sampleSize={sampleSize}
          query={appState.query}
          columns={appState.columns ?? []}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter />
    </EuiFlyout>
  );
}
