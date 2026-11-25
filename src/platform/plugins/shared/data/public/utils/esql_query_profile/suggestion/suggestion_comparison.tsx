/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResultsVerdict } from './compare_results';
import { formatChange, formatDurationMillis } from '../shared/profile_format';
import type { QueryProfileView } from '../profile/types';

/** Says in words how the results of the suggestion compare with the original's. */
const describeVerdict = (verdict: ResultsVerdict): string => {
  switch (verdict.kind) {
    case 'same':
      return verdict.sameOrder
        ? i18n.translate('data.inspector.queryProfile.sameResultsLabel', {
            defaultMessage: 'Same results: {rowCount, plural, one {# row} other {# rows}}.',
            values: { rowCount: verdict.rowCount },
          })
        : i18n.translate('data.inspector.queryProfile.sameResultsOtherOrderLabel', {
            defaultMessage:
              'Same results: {rowCount, plural, one {# row} other {# rows}}, in a different order.',
            values: { rowCount: verdict.rowCount },
          });
    case 'differentColumns':
      return i18n.translate('data.inspector.queryProfile.differentColumnsLabel', {
        defaultMessage:
          'The columns or their types differ from the original query, so this is not an equivalent query.',
      });
    case 'differentRowCount':
      return i18n.translate('data.inspector.queryProfile.differentRowCountLabel', {
        defaultMessage:
          'It returns {current, plural, one {# row} other {# rows}} and the original returned {baseline}. This is not an equivalent query.',
        values: { current: verdict.current, baseline: verdict.baseline },
      });
    case 'differentRows':
      return i18n.translate('data.inspector.queryProfile.differentRowsLabel', {
        defaultMessage:
          'The number of rows matches but the values differ. Without a SORT, rows beyond the limit can vary between runs, otherwise this is not an equivalent query.',
      });
  }
};

export function ResultsCheck({ verdict }: { verdict: ResultsVerdict | undefined }) {
  if (!verdict) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileResultsCheck">
        <FormattedMessage
          id="data.inspector.queryProfile.resultsNotComparedDescription"
          defaultMessage="The results could not be compared."
        />
      </EuiText>
    );
  }

  return (
    <EuiText
      size="xs"
      color={verdict.kind === 'same' ? 'success' : 'danger'}
      data-test-subj="esqlQueryProfileResultsCheck"
    >
      <strong>{describeVerdict(verdict)}</strong>
    </EuiText>
  );
}

/** The time of the original query next to the time of the suggestion. */
export function TimeComparison({
  original,
  suggested,
}: {
  original: QueryProfileView;
  suggested: QueryProfileView;
}) {
  const { queryTookMillis: before } = original;
  const { queryTookMillis: after } = suggested;
  if (before === undefined || after === undefined) {
    return null;
  }

  return (
    <EuiText size="xs" data-test-subj="esqlQueryProfileTimeComparison">
      <p>
        <FormattedMessage
          id="data.inspector.queryProfile.timeComparisonDescription"
          defaultMessage="Original {before}, suggestion {after}{hasChange, select, true { ({change})} other {}}"
          values={{
            before: formatDurationMillis(before),
            after: formatDurationMillis(after),
            hasChange: before > 0,
            change: before > 0 ? formatChange((after - before) / before) : '',
          }}
        />
      </p>
    </EuiText>
  );
}
