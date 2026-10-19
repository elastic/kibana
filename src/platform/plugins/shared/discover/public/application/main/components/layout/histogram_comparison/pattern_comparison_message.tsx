/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  HistogramComparisonContext,
  HistogramComparisonResult,
  HistogramComparisonSelection,
} from '../../../../../context_awareness/types';
import { useHistogramComparisonState } from './use_histogram_comparison_state';

export type PatternComparisonMessageState = 'hint' | 'approximate' | 'unavailable';

export const getPatternComparisonMessageState = ({
  defaultHistogramAvailable,
  chartHidden,
  selection,
  result,
}: {
  defaultHistogramAvailable: boolean;
  chartHidden: boolean;
  selection: HistogramComparisonSelection | undefined;
  result: HistogramComparisonResult | undefined;
}): PatternComparisonMessageState | undefined => {
  if (!defaultHistogramAvailable || chartHidden) {
    return undefined;
  }
  if (!selection) {
    return 'hint';
  }
  if (result?.key !== selection.key) {
    return undefined;
  }
  return result.status === 'approximate' || result.status === 'unavailable'
    ? result.status
    : undefined;
};

export const usePatternComparisonMessageState = ({
  chartHidden,
  ...context
}: HistogramComparisonContext & {
  chartHidden: boolean;
}): PatternComparisonMessageState | undefined => {
  const { selection, result } = useHistogramComparisonState(context);
  return getPatternComparisonMessageState({
    defaultHistogramAvailable: context.defaultHistogramAvailable,
    chartHidden,
    selection,
    result,
  });
};

const comparisonMessages = {
  approximate: {
    id: 'discover.histogramComparison.approximateDescription',
    defaultMessage: 'Pattern comparison is approximate.',
    dataTestSubj: 'patternHistogramApproximate',
  },
  unavailable: {
    id: 'discover.histogramComparison.unavailableDescription',
    defaultMessage: 'Pattern comparison is unavailable.',
    dataTestSubj: 'patternHistogramComparisonUnavailable',
  },
  hint: {
    id: 'discover.histogramComparison.hintDescription',
    defaultMessage: 'Select a pattern to compare its volume with total document volume.',
    dataTestSubj: 'patternHistogramComparisonHint',
  },
} as const;

const messageTextStyles = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const PatternComparisonMessage = ({
  patternComparison,
}: {
  patternComparison: PatternComparisonMessageState;
}) => {
  const message = comparisonMessages[patternComparison];

  return (
    <EuiToolTip
      content={<FormattedMessage id={message.id} defaultMessage={message.defaultMessage} />}
      display="block"
      position="top"
      anchorProps={{
        css: css({
          display: 'block',
          minWidth: 0,
          maxWidth: '100%',
        }),
      }}
    >
      <EuiText
        size="xs"
        color="subdued"
        tabIndex={0}
        data-test-subj={message.dataTestSubj}
        css={messageTextStyles}
      >
        <FormattedMessage id={message.id} defaultMessage={message.defaultMessage} />
      </EuiText>
    </EuiToolTip>
  );
};
