/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView } from './types';
import {
  operatorCategoryLabel,
  summarizeCpuByCategory,
  useOperatorCategoryColors,
} from './operator_category';
import { formatDurationMillis, formatShare } from './profile_format';
import { LegendSwatch } from './legend_swatch';

const useSummaryStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    track: css`
      display: flex;
      width: 100%;
      height: ${euiTheme.size.m};
      overflow: hidden;
      background: ${euiTheme.colors.backgroundBaseFormsControlDisabled};
      border-radius: ${euiTheme.border.radius.medium};
    `,
    planning: css`
      background: ${euiTheme.colors.warning};
    `,
    execution: css`
      background: ${euiTheme.colors.primary};
    `,
  };
};

const DurationSummary = ({ view }: { view: QueryProfileView }) => {
  const styles = useSummaryStyles();
  const { queryTookMillis, planningTookMillis, executionTookMillis } = view;
  const total = (planningTookMillis ?? 0) + (executionTookMillis ?? 0);
  const hasSplit =
    planningTookMillis !== undefined && executionTookMillis !== undefined && total > 0;

  return (
    <div data-test-subj="esqlQueryProfileDuration">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              {queryTookMillis !== undefined
                ? formatDurationMillis(queryTookMillis)
                : i18n.translate('data.inspector.queryProfile.durationUnknownTitle', {
                    defaultMessage: 'Duration unavailable',
                  })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.profiledRunLabel"
                defaultMessage="Profiled run · {driverCount, plural, one {# driver} other {# drivers}}"
                values={{ driverCount: view.driverCount }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasSplit ? (
        <>
          <EuiSpacer size="s" />
          <div
            css={styles.track}
            role="img"
            aria-label={i18n.translate('data.inspector.queryProfile.durationSplitAriaLabel', {
              defaultMessage: 'Planning {planning}, execution {execution}',
              values: {
                planning: formatDurationMillis(planningTookMillis),
                execution: formatDurationMillis(executionTookMillis),
              },
            })}
          >
            <div
              css={styles.planning}
              style={{ width: `${(planningTookMillis / total) * 100}%` }}
            />
            <div
              css={styles.execution}
              style={{ width: `${(executionTookMillis / total) * 100}%` }}
            />
          </div>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <LegendSwatch
                colorCss={styles.planning}
                label={i18n.translate('data.inspector.queryProfile.planningLegendLabel', {
                  defaultMessage: 'Planning {time}',
                  values: { time: formatDurationMillis(planningTookMillis) },
                })}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LegendSwatch
                colorCss={styles.execution}
                label={i18n.translate('data.inspector.queryProfile.executionLegendLabel', {
                  defaultMessage: 'Execution {time}',
                  values: { time: formatDurationMillis(executionTookMillis) },
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </div>
  );
};

const CpuByKind = ({ view }: { view: QueryProfileView }) => {
  const styles = useSummaryStyles();
  const categoryColor = useOperatorCategoryColors();
  const breakdown = summarizeCpuByCategory(view.operators);
  if (breakdown.length === 0) {
    return null;
  }

  const entries = breakdown.map(({ category, share }) => ({
    category,
    share,
    text: `${operatorCategoryLabel(category)} ${formatShare(share)}`,
  }));

  return (
    <div data-test-subj="esqlQueryProfileCpuBreakdown">
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="data.inspector.queryProfile.cpuBreakdownTitle"
            defaultMessage="CPU time by kind of work"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <div css={styles.track} role="img" aria-label={entries.map(({ text }) => text).join(', ')}>
        {entries.map(({ category, share }) => (
          <div
            key={category}
            style={{ width: `${share * 100}%`, background: categoryColor[category] }}
          />
        ))}
      </div>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        {entries.map(({ category, text }) => (
          <EuiFlexItem grow={false} key={category}>
            <LegendSwatch
              colorCss={css`
                background: ${categoryColor[category]};
              `}
              label={text}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.cpuTimeDescription"
            defaultMessage="Operator times are CPU time summed across drivers, so they will not add up to the total query time."
          />
        </p>
      </EuiText>
    </div>
  );
};

/** The total time, how it splits between planning and execution, and the CPU time by kind of work. */
export const ProfileSummary = ({ view }: { view: QueryProfileView }) => (
  <>
    <DurationSummary view={view} />
    <EuiSpacer size="m" />
    <CpuByKind view={view} />
  </>
);
