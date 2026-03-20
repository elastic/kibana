/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ENABLE_ESQL_DATA_INSIGHTS } from '@kbn/esql-utils';
import { FetchStatus } from '../../../types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useCurrentTabDataStateContainer } from '../../state_management/redux';
import { useDataState } from '../../hooks/use_data_state';
import { DataInsightsFlyout } from './data_insights_flyout';

export const DataInsightsButton: React.FC = () => {
  const services = useDiscoverServices();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const isEnabled = services.uiSettings.get<boolean>(ENABLE_ESQL_DATA_INSIGHTS, false);

  const dataStateContainer = useCurrentTabDataStateContainer();
  const documentsState = useDataState(dataStateContainer.data$.documents$);

  const isResultsLoaded =
    documentsState.fetchStatus === FetchStatus.COMPLETE ||
    documentsState.fetchStatus === FetchStatus.PARTIAL;

  const hasResults = isResultsLoaded && (documentsState.result?.length ?? 0) > 0;

  const onOpenFlyout = useCallback(() => {
    setIsFlyoutOpen(true);
  }, []);

  const onCloseFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  if (!isEnabled || !hasResults) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="center"
        gutterSize="none"
        responsive={false}
        css={{ padding: '0 8px' }}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="sparkles"
            onClick={onOpenFlyout}
            data-test-subj="discoverDataInsightsButton"
          >
            {i18n.translate('discover.dataInsights.buttonLabel', {
              defaultMessage: 'Summarize with AI',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && <DataInsightsFlyout onClose={onCloseFlyout} />}
    </>
  );
};
