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
import { FetchStatus } from '../../application/types';
import { useDataState } from '../../application/main/hooks/use_data_state';
import { useCurrentTabDataStateContainer } from '../../application/main/state_management/redux';

export type HitsCounterVariant = 'documents' | 'results' | 'groups';

export interface HitsCounterProps {
  variant: HitsCounterVariant;
  hitsTotalToDisplay?: number;
}

interface CountLabelValues {
  hits?: number;
  formattedHits: React.ReactNode;
}

const COUNT_LABELS: Record<
  HitsCounterVariant,
  Record<'full' | 'partial', (values: CountLabelValues) => React.ReactNode>
> = {
  documents: {
    full: ({ hits, formattedHits }) => (
      <FormattedMessage
        id="discover.hitsCounter.documentsLabel"
        defaultMessage="{formattedHits} {hits, plural, one {document} other {documents}}"
        values={{ hits, formattedHits }}
      />
    ),
    partial: ({ hits, formattedHits }) => (
      <FormattedMessage
        id="discover.hitsCounter.partialDocumentsLabel"
        defaultMessage="≥{formattedHits} {hits, plural, one {document} other {documents}}"
        values={{ hits, formattedHits }}
      />
    ),
  },
  results: {
    full: ({ hits, formattedHits }) => (
      <FormattedMessage
        id="discover.hitsCounter.resultsLabel"
        defaultMessage="{formattedHits} {hits, plural, one {result} other {results}}"
        values={{ hits, formattedHits }}
      />
    ),
    partial: ({ hits, formattedHits }) => (
      <FormattedMessage
        id="discover.hitsCounter.partialResultsLabel"
        defaultMessage="≥{formattedHits} {hits, plural, one {result} other {results}}"
        values={{ hits, formattedHits }}
      />
    ),
  },
  groups: {
    full: ({ hits, formattedHits }) => (
      <FormattedMessage
        id="discover.hitsCounter.groupsLabel"
        defaultMessage="{formattedHits} {hits, plural, one {group} other {groups}}"
        values={{ hits, formattedHits }}
      />
    ),
    partial: ({ hits, formattedHits }) => (
      <FormattedMessage
        id="discover.hitsCounter.partialGroupsLabel"
        defaultMessage="≥{formattedHits} {hits, plural, one {group} other {groups}}"
        values={{ hits, formattedHits }}
      />
    ),
  },
};

export const HitsCounter: React.FC<HitsCounterProps> = ({ variant, hitsTotalToDisplay }) => {
  const dataStateContainer = useCurrentTabDataStateContainer();
  const totalHits$ = dataStateContainer.data$.totalHits$;
  const totalHitsState = useDataState(totalHits$);
  let hitsTotal = hitsTotalToDisplay || totalHitsState.result;
  const hitsStatus = totalHitsState.fetchStatus;

  const documents$ = dataStateContainer.data$.documents$;
  const documentsState = useDataState(documents$);
  const documentsCount = documentsState.result?.length || 0;

  if (!hitsTotal && hitsStatus === FetchStatus.LOADING) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (
    !hitsTotalToDisplay &&
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

  const countLabel = COUNT_LABELS[variant][showGreaterOrEqualSign ? 'partial' : 'full']({
    hits: hitsTotal,
    formattedHits,
  });

  return (
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      justifyContent="center"
      alignItems="center"
      className="eui-textTruncate eui-textNoWrap"
      css={hitsCounterCss}
      data-test-subj="discoverQueryTotalHits"
      data-fetch-status={hitsStatus}
    >
      <EuiFlexItem grow={false} aria-live="polite" css={hitsCounterTextCss}>
        <EuiText className="eui-textTruncate" size="s">
          <strong>{countLabel}</strong>
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
};
