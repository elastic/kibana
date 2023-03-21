/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { UnifiedHistogramHitsContext } from '../types';

export interface HitsCounterProps {
  hits: UnifiedHistogramHitsContext;
  append?: ReactElement;
}

export function HitsCounter({ hits, append }: HitsCounterProps) {
  if (!hits.total && hits.status === 'loading') {
    return null;
  }

  const formattedHits = (
    <strong
      data-test-subj={
        hits.status === 'partial' ? 'unifiedHistogramQueryHitsPartial' : 'unifiedHistogramQueryHits'
      }
    >
      <FormattedNumber value={hits.total ?? 0} />
    </strong>
  );

  const hitsCounterCss = css`
    flex-grow: 0;
  `;
  const hitsCounterTextCss = css`
    overflow: hidden;
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      justifyContent="center"
      alignItems="center"
      css={hitsCounterCss}
    >
      <EuiFlexItem grow={false} aria-live="polite" css={hitsCounterTextCss}>
        <EuiText className="eui-textTruncate">
          {hits.status === 'partial' && (
            <FormattedMessage
              id="unifiedHistogram.partialHits"
              defaultMessage="≥{formattedHits} {hits, plural, one {hit} other {hits}}"
              values={{ hits: hits.total, formattedHits }}
            />
          )}
          {hits.status !== 'partial' && (
            <FormattedMessage
              id="unifiedHistogram.hitsPluralTitle"
              defaultMessage="{formattedHits} {hits, plural, one {hit} other {hits}}"
              values={{ hits: hits.total, formattedHits }}
            />
          )}
        </EuiText>
      </EuiFlexItem>
      {hits.status === 'partial' && (
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
