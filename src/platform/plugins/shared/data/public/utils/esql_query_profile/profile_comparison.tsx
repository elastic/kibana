/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView } from './aggregate_esql_profile';
import { compareProfiles } from './compare_profiles';
import type { MetricComparison, OperatorComparison, Trend } from './compare_profiles';
import type { ProfileBaseline } from './profile_baseline';
import { formatChange, formatDurationMillis } from './query_profile_format';

const MAX_QUERY_LABEL_LENGTH = 90;

const trendColor = (trend: Trend): 'success' | 'danger' | 'subdued' =>
  trend === 'faster' ? 'success' : trend === 'slower' ? 'danger' : 'subdued';

function ChangeLabel({ trend, ratio }: { trend: Trend; ratio?: number }) {
  if (trend === 'same') {
    return (
      <EuiText size="xs" color="subdued" component="span">
        {i18n.translate('data.inspector.queryProfile.noChangeLabel', {
          defaultMessage: 'No change',
        })}
      </EuiText>
    );
  }

  return (
    <EuiText size="xs" color={trendColor(trend)} component="span">
      <strong>{ratio === undefined ? trendWord(trend) : formatChange(ratio)}</strong>
    </EuiText>
  );
}

function trendWord(trend: Trend): string {
  return trend === 'faster'
    ? i18n.translate('data.inspector.queryProfile.fasterLabel', { defaultMessage: 'Faster' })
    : i18n.translate('data.inspector.queryProfile.slowerLabel', { defaultMessage: 'Slower' });
}

function MetricRow({
  label,
  metric,
  testSubject,
}: {
  label: string;
  metric: MetricComparison | undefined;
  testSubject: string;
}) {
  if (!metric) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} data-test-subj={testSubject}>
      <EuiFlexItem grow={2}>
        <EuiText size="xs">{label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('data.inspector.queryProfile.fromToLabel', {
            defaultMessage: '{from} → {to}',
            values: {
              from: formatDurationMillis(metric.baseline),
              to: formatDurationMillis(metric.current),
            },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <ChangeLabel trend={metric.trend} ratio={metric.ratio} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function OperatorRow({ operator }: { operator: OperatorComparison }) {
  const nanosLabel = (nanos: number | undefined) =>
    nanos === undefined
      ? i18n.translate('data.inspector.queryProfile.notInRunLabel', {
          defaultMessage: 'not in run',
        })
      : formatDurationMillis(nanos / 1e6);

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      data-test-subj="esqlQueryProfileComparedOperator"
    >
      <EuiFlexItem grow={2}>
        <EuiText size="xs">{operator.title}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('data.inspector.queryProfile.fromToLabel', {
            defaultMessage: '{from} → {to}',
            values: {
              from: nanosLabel(operator.baselineNanos),
              to: nanosLabel(operator.currentNanos),
            },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <ChangeLabel trend={operator.trend} ratio={operator.ratio} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const toOneLine = (query: string): string => query.replace(/\s+/g, ' ').trim();

function shortQuery(query: string): string {
  const oneLine = toOneLine(query);
  return oneLine.length > MAX_QUERY_LABEL_LENGTH
    ? `${oneLine.slice(0, MAX_QUERY_LABEL_LENGTH)}…`
    : oneLine;
}

/** Shows how the current run differs from the saved baseline run. */
export function ProfileComparisonPanel({
  baseline,
  current,
  currentQuery,
  baselineLabel,
}: {
  baseline: ProfileBaseline;
  current: QueryProfileView;
  /** The query of the current run. The baseline query is only shown when it differs. */
  currentQuery?: string;
  /** Replaces the default title, for example when the baseline is the original query. */
  baselineLabel?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const comparison = compareProfiles(baseline.view, current);
  const isSameQuery =
    currentQuery !== undefined && toOneLine(currentQuery) === toOneLine(baseline.query);

  return (
    <div data-test-subj="esqlQueryProfileComparison">
      <EuiText size="xs">
        <strong>
          {baselineLabel ?? (
            <FormattedMessage
              id="data.inspector.queryProfile.comparisonTitle"
              defaultMessage="Compared with the baseline run"
            />
          )}
        </strong>
      </EuiText>
      {isSameQuery ? null : (
        <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileBaselineQuery">
          <p>
            <code>{shortQuery(baseline.query)}</code>
          </p>
        </EuiText>
      )}
      <EuiSpacer size="xs" />
      <MetricRow
        label={i18n.translate('data.inspector.queryProfile.totalTimeLabel', {
          defaultMessage: 'Total time',
        })}
        metric={comparison.total}
        testSubject="esqlQueryProfileComparedTotal"
      />
      {comparison.operators.length > 0 ? (
        <OperatorRow operator={comparison.operators[0]} />
      ) : (
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="data.inspector.queryProfile.noOperatorChangedDescription"
            defaultMessage="No operator changed noticeably."
          />
        </EuiText>
      )}
      <EuiButtonEmpty
        size="xs"
        flush="left"
        iconType={showDetails ? 'chevronSingleDown' : 'chevronSingleRight'}
        onClick={() => setShowDetails((shown) => !shown)}
        aria-expanded={showDetails}
        data-test-subj="esqlQueryProfileComparisonDetails"
      >
        {showDetails
          ? i18n.translate('data.inspector.queryProfile.hideDetailsButtonLabel', {
              defaultMessage: 'Hide details',
            })
          : i18n.translate('data.inspector.queryProfile.showDetailsButtonLabel', {
              defaultMessage: 'Show details',
            })}
      </EuiButtonEmpty>
      {showDetails ? (
        <div data-test-subj="esqlQueryProfileComparisonDetailsContent">
          <MetricRow
            label={i18n.translate('data.inspector.queryProfile.planningTimeLabel', {
              defaultMessage: 'Planning',
            })}
            metric={comparison.planning}
            testSubject="esqlQueryProfileComparedPlanning"
          />
          <MetricRow
            label={i18n.translate('data.inspector.queryProfile.executionTimeLabel', {
              defaultMessage: 'Execution',
            })}
            metric={comparison.execution}
            testSubject="esqlQueryProfileComparedExecution"
          />
          <MetricRow
            label={i18n.translate('data.inspector.queryProfile.operatorCpuLabel', {
              defaultMessage: 'Operator CPU',
            })}
            metric={comparison.cpu}
            testSubject="esqlQueryProfileComparedCpu"
          />
          <EuiSpacer size="s" />
          {comparison.operators.slice(1).map((operator) => (
            <OperatorRow key={operator.title} operator={operator} />
          ))}
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="data.inspector.queryProfile.runVariationDescription"
              defaultMessage="A single run varies, for example with caching. Profile again to check that a change is real."
            />
          </EuiText>
        </div>
      ) : null}
      <EuiSpacer size="m" />
    </div>
  );
}
