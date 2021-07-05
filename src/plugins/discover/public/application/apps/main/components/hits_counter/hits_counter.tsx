/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './hits_counter.scss';

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { formatNumWithCommas } from '../../../../helpers';
import { DataTotalHits$, DataTotalHitsMsg } from '../../services/use_saved_search';
import { FetchStatus } from '../../../../types';
import { useDataState } from '../../utils/use_data_state';

export interface HitsCounterProps {
  /**
   * displays the reset button
   */
  showResetButton: boolean;
  /**
   * resets the query
   */
  onResetQuery: () => void;

  savedSearchData$: DataTotalHits$;
}

export function HitsCounter({ showResetButton, onResetQuery, savedSearchData$ }: HitsCounterProps) {
  const data: DataTotalHitsMsg = useDataState(savedSearchData$);

  const hits = data.result || 0;
  if (!hits && data.fetchStatus === FetchStatus.LOADING) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiFlexGroup
      className="dscHitsCounter"
      gutterSize="s"
      responsive={false}
      justifyContent="center"
      alignItems="center"
    >
      <EuiFlexItem grow={false}>
        <EuiText>
          <strong data-test-subj="discoverQueryHits">{formatNumWithCommas(hits)}</strong>{' '}
          <FormattedMessage
            id="discover.hitsPluralTitle"
            defaultMessage="{hits, plural, one {hit} other {hits}}"
            values={{
              hits,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      {showResetButton && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="refresh"
            data-test-subj="resetSavedSearch"
            onClick={onResetQuery}
            size="s"
            aria-label={i18n.translate('discover.reloadSavedSearchButton', {
              defaultMessage: 'Reset search',
            })}
          >
            <FormattedMessage id="discover.reloadSavedSearchButton" defaultMessage="Reset search" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
