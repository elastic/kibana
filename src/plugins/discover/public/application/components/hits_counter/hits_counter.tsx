/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './hits_counter.scss';

import React, { useState, useEffect } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { formatNumWithCommas } from '../../helpers';
import { TotalHitsSubject } from '../histogram/use_total_hits';

export interface HitsCounterProps {
  /**
   * the number of query hits
   */
  hits$: TotalHitsSubject;
  /**
   * displays the reset button
   */
  showResetButton: boolean;
  /**
   * resets the query
   */
  onResetQuery: () => void;
}

export function HitsCounter({ hits$, showResetButton, onResetQuery }: HitsCounterProps) {
  const [total, setTotal] = useState(hits$.getValue().total || 0);
  useEffect(() => {
    const subscription = hits$.subscribe({
      next: (res) => {
        if (res && res.state === 'success' && res.total !== total && Number(res.total) >= 0) {
          setTotal(Number(res.total));
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [hits$, total, setTotal]);
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
            <strong data-test-subj="discoverQueryHits">{formatNumWithCommas(total)}</strong>{' '}
            <FormattedMessage
              id="discover.hitsPluralTitle"
              defaultMessage="{hits, plural, one {hit} other {hits}}"
              values={{
                hits: total,
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
