/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './hits_counter.scss';
import React, { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { UnifiedHistogramStatus } from '../types';

export interface HitsCounterProps {
  hits: number;
  status: UnifiedHistogramStatus;
  append?: ReactNode;
}

export function HitsCounter({ hits, status, append }: HitsCounterProps) {
  if (!hits && status === 'loading') {
    return null;
  }

  const formattedHits = (
    <strong
      data-test-subj={
        status === 'partial' ? 'unifiedHistogramQueryHitsPartial' : 'unifiedHistogramQueryHits'
      }
    >
      <FormattedNumber value={hits} />
    </strong>
  );

  return (
    <EuiFlexGroup
      className="unifiedHistogramHitsCounter"
      gutterSize="s"
      responsive={false}
      justifyContent="center"
      alignItems="center"
    >
      <EuiFlexItem grow={false} aria-live="polite">
        <EuiText>
          {status === 'partial' && (
            <FormattedMessage
              id="unifiedHistogram.partialHits"
              defaultMessage="≥{formattedHits} {hits, plural, one {hit} other {hits}}"
              values={{ hits, formattedHits }}
            />
          )}
          {status !== 'partial' && (
            <FormattedMessage
              id="unifiedHistogram.hitsPluralTitle"
              defaultMessage="{formattedHits} {hits, plural, one {hit} other {hits}}"
              values={{ hits, formattedHits }}
            />
          )}
        </EuiText>
      </EuiFlexItem>
      {status === 'partial' && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner
            size="m"
            aria-label={i18n.translate('unifiedHistogram.hitCountSpinnerAriaLabel', {
              defaultMessage: 'Final hit count still loading',
            })}
          />
        </EuiFlexItem>
      )}
      {append}
    </EuiFlexGroup>
  );
}
