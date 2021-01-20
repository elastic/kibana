/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './hits_counter.scss';

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { formatNumWithCommas } from '../../helpers';

export interface HitsCounterProps {
  /**
   * the number of query hits
   */
  hits: number;
  /**
   * displays the reset button
   */
  showResetButton: boolean;
  /**
   * resets the query
   */
  onResetQuery: () => void;
}

export function HitsCounter({ hits, showResetButton, onResetQuery }: HitsCounterProps) {
  return (
    <I18nProvider>
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
              <FormattedMessage
                id="discover.reloadSavedSearchButton"
                defaultMessage="Reset search"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </I18nProvider>
  );
}
