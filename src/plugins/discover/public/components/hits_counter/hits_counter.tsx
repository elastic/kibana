/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { DiscoverStateContainer } from '../../application/main/state_management/discover_state';
import { FetchStatus } from '../../application/types';
import { useDataState } from '../../application/main/hooks/use_data_state';

export enum HitsCounterMode {
  standalone = 'standalone',
  appended = 'appended',
}

export interface HitsCounterProps {
  mode: HitsCounterMode;
  stateContainer: DiscoverStateContainer;
}

export const HitsCounter: React.FC<HitsCounterProps> = ({ mode, stateContainer }) => {
  const totalHits$ = stateContainer.dataState.data$.totalHits$;
  const totalHitsState = useDataState(totalHits$);
  let hitsTotal = totalHitsState.result;
  const hitsStatus = totalHitsState.fetchStatus;

  const documents$ = stateContainer.dataState.data$.documents$;
  const documentsState = useDataState(documents$);
  const documentsCount = documentsState.result?.length || 0;

  if (!hitsTotal && hitsStatus === FetchStatus.LOADING) {
    return null;
  }

  if (
    hitsStatus === FetchStatus.ERROR &&
    documentsState.fetchStatus === FetchStatus.COMPLETE &&
    documentsCount > (hitsTotal ?? 0)
  ) {
    // if histogram returned partial results and which are less than the fetched documents count =>
    // override hitsTotal with the fetched documents count
    hitsTotal = documentsCount;
  }

  const showGreaterOrEqualSign =
    hitsStatus === FetchStatus.PARTIAL || hitsStatus === FetchStatus.ERROR;

  const formattedHits = (
    <span
      data-test-subj={showGreaterOrEqualSign ? 'discoverQueryHitsPartial' : 'discoverQueryHits'}
    >
      <FormattedNumber value={hitsTotal ?? 0} />
    </span>
  );

  const hitsCounterCss = css`
    display: inline-flex;
  `;
  const hitsCounterTextCss = css`
    overflow: hidden;
  `;

  const element = (
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      justifyContent="center"
      alignItems="center"
      className="eui-textTruncate eui-textNoWrap"
      css={hitsCounterCss}
      data-test-subj="discoverQueryTotalHits"
    >
      <EuiFlexItem grow={false} aria-live="polite" css={hitsCounterTextCss}>
        <EuiText className="eui-textTruncate" size="s">
          <strong>
            {showGreaterOrEqualSign ? (
              mode === HitsCounterMode.standalone ? (
                <FormattedMessage
                  id="discover.hitsCounter.partialHitsPluralTitle"
                  defaultMessage="≥{formattedHits} {hits, plural, one {result} other {results}}"
                  values={{ hits: hitsTotal, formattedHits }}
                />
              ) : (
                <FormattedMessage
                  id="discover.hitsCounter.partialHits"
                  defaultMessage="≥{formattedHits}"
                  values={{ formattedHits }}
                />
              )
            ) : mode === HitsCounterMode.standalone ? (
              <FormattedMessage
                id="discover.hitsCounter.hitsPluralTitle"
                defaultMessage="{formattedHits} {hits, plural, one {result} other {results}}"
                values={{ hits: hitsTotal, formattedHits }}
              />
            ) : (
              formattedHits
            )}
          </strong>
        </EuiText>
      </EuiFlexItem>
      {hitsStatus === FetchStatus.PARTIAL && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner
            size="m"
            aria-label={i18n.translate('discover.hitsCounter.hitCountSpinnerAriaLabel', {
              defaultMessage: 'Final hit count still loading',
            })}
          />
        </EuiFlexItem>
      )}
      {hitsStatus === FetchStatus.ERROR && (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="warning"
            color="warning"
            size="s"
            content={i18n.translate('discover.hitsCounter.hitCountWarningTooltip', {
              defaultMessage: 'Results might be incomplete',
            })}
            iconProps={{ css: { display: 'block' } }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return mode === HitsCounterMode.appended ? (
    <>
      {' ('}
      {element}
      {')'}
    </>
  ) : (
    element
  );
};
