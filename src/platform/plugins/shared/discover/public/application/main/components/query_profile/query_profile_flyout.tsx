/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type {
  PlanningPhaseId,
  QueryProfileView,
  AggregatedOperator,
} from './aggregate_esql_profile';
import {
  formatBytes,
  formatCount,
  formatDurationMillis,
  formatExpansion,
  formatShare,
  formatThroughput,
} from './query_profile_format';

export interface QueryProfileFlyoutProps {
  loadProfile: (signal: AbortSignal) => Promise<QueryProfileView>;
}

export function QueryProfileFlyout({ loadProfile }: QueryProfileFlyoutProps) {
  const [view, setView] = useState<QueryProfileView | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [expandedOperator, setExpandedOperator] = useState<string | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    loadProfile(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setView(next);
        }
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : i18n.translate('discover.queryProfile.unknownError', {
                defaultMessage: 'The query profile failed.',
              })
        );
      });

    return () => {
      controller.abort();
    };
  }, [loadProfile]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="discoverQueryProfileTitle">
            <FormattedMessage id="discover.queryProfile.title" defaultMessage="Query profile" />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="discover.queryProfile.description"
              defaultMessage="Profiles the table query, including its filters and time range. The chart query is not included."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div data-test-subj="discoverQueryProfileFlyout">
          {error ? (
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('discover.queryProfile.errorTitle', {
                defaultMessage: 'Unable to profile this query',
              })}
              text={error}
            />
          ) : !view ? (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              data-test-subj="discoverQueryProfileLoading"
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <FormattedMessage
                    id="discover.queryProfile.loading"
                    defaultMessage="Running the query with profiling."
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <QueryProfileBody
              view={view}
              expandedOperator={expandedOperator}
              onToggleOperator={(operator) =>
                setExpandedOperator((current) => (current === operator ? undefined : operator))
              }
            />
          )}
        </div>
      </EuiFlyoutBody>
    </>
  );
}

function QueryProfileBody({
  view,
  expandedOperator,
  onToggleOperator,
}: {
  view: QueryProfileView;
  expandedOperator?: string;
  onToggleOperator: (operator: string) => void;
}) {
  return (
    <>
      <DurationBar view={view} />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="discover.queryProfile.driverCount"
            defaultMessage="{driverCount, plural, one {# driver} other {# drivers}}"
            values={{ driverCount: view.driverCount }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {view.operators.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="discover.queryProfile.noOperators"
              defaultMessage="This profile did not include any operators."
            />
          </p>
        </EuiText>
      ) : (
        view.operators.map((operator) => (
          <OperatorRow
            key={operator.operator}
            operator={operator}
            isExpanded={expandedOperator === operator.operator}
            onToggle={() => onToggleOperator(operator.operator)}
          />
        ))
      )}
      {view.plans.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="discoverQueryProfilePlan"
            buttonContent={i18n.translate('discover.queryProfile.planLabel', {
              defaultMessage: 'Physical plan',
            })}
            data-test-subj="discoverQueryProfilePlan"
          >
            <EuiSpacer size="s" />
            {view.plans.map((plan, index) => (
              <div key={`${plan.node_name ?? 'plan'}-${index}`}>
                {plan.node_name ? (
                  <EuiText size="xs" color="subdued">
                    <p>{plan.node_name}</p>
                  </EuiText>
                ) : null}
                <EuiCodeBlock language="text" fontSize="s" paddingSize="s" isCopyable>
                  {plan.plan}
                </EuiCodeBlock>
              </div>
            ))}
          </EuiAccordion>
        </>
      ) : null}
    </>
  );
}

function DurationBar({ view }: { view: QueryProfileView }) {
  const styles = useProfileStyles();
  const planning = view.planningTookMillis;
  const execution = view.executionTookMillis;
  const total =
    planning !== undefined && execution !== undefined ? planning + execution : view.queryTookMillis;
  const planningShare = total && planning !== undefined ? (planning / total) * 100 : 0;
  const executionShare = total && execution !== undefined ? (execution / total) * 100 : 0;
  const hasSplit = planning !== undefined && execution !== undefined && (total ?? 0) > 0;

  return (
    <div data-test-subj="discoverQueryProfileDuration">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {view.queryTookMillis !== undefined
                ? formatDurationMillis(view.queryTookMillis)
                : i18n.translate('discover.queryProfile.durationUnknown', {
                    defaultMessage: 'Duration unavailable',
                  })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="discover.queryProfile.totalTimeLabel"
                defaultMessage="Total query time"
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div css={styles.summaryTrack} role="img" aria-label={durationAriaLabel(view)}>
        {hasSplit ? (
          <>
            <div css={styles.planningSegment} style={{ width: `${planningShare}%` }} />
            <div css={styles.executionSegment} style={{ width: `${executionShare}%` }} />
          </>
        ) : (
          <div css={styles.executionSegment} style={{ width: '100%' }} />
        )}
      </div>
      {hasSplit ? (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={<PlanningTooltip view={view} />}>
                <LegendSwatch
                  colorCss={styles.planningSwatch}
                  label={i18n.translate('discover.queryProfile.planningLegend', {
                    defaultMessage: 'Planning {time}',
                    values: { time: formatDurationMillis(planning ?? 0) },
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LegendSwatch
                colorCss={styles.executionSwatch}
                label={i18n.translate('discover.queryProfile.executionLegend', {
                  defaultMessage: 'Execution {time}',
                  values: { time: formatDurationMillis(execution ?? 0) },
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </div>
  );
}

function PlanningTooltip({ view }: { view: QueryProfileView }) {
  if (view.planningPhases.length === 0) {
    return (
      <FormattedMessage
        id="discover.queryProfile.planningTooltip"
        defaultMessage="Planning {time}"
        values={{ time: formatDurationMillis(view.planningTookMillis ?? 0) }}
      />
    );
  }

  return (
    <>
      {view.planningPhases.map((phase) => (
        <div key={phase.id}>
          {i18n.translate('discover.queryProfile.planningPhase', {
            defaultMessage: '{phase} {time}',
            values: {
              phase: planningPhaseLabel(phase.id),
              time: formatDurationMillis(phase.tookMillis),
            },
          })}
        </div>
      ))}
    </>
  );
}

function OperatorRow({
  operator,
  isExpanded,
  onToggle,
}: {
  operator: AggregatedOperator;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const styles = useProfileStyles();
  const time = formatDurationMillis(operator.processNanos / 1e6);
  const share = formatShare(operator.share);
  const hasRead =
    operator.bytesDecoded !== undefined && operator.throughputBytesPerSecond !== undefined;

  return (
    <div css={styles.operator} data-test-subj="discoverQueryProfileOperator">
      <button
        type="button"
        css={styles.operatorButton}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={i18n.translate('discover.queryProfile.operatorButtonLabel', {
          defaultMessage: '{title}, {time}, {share}',
          values: { title: operator.title, time, share },
        })}
      >
        <span css={styles.operatorHeader}>
          <EuiIcon
            type={isExpanded ? 'arrowDown' : 'arrowRight'}
            size="s"
            css={styles.chevron}
            aria-hidden="true"
          />
          <span css={styles.operatorName}>
            <span css={styles.operatorTitle}>{operator.title}</span>
            {operator.detail ? (
              <span css={styles.operatorDetail} title={operator.detail}>
                {operator.detail}
              </span>
            ) : null}
          </span>
          <span css={styles.operatorTime}>{time}</span>
          <span css={styles.operatorShare}>{share}</span>
        </span>
        <span css={styles.track} aria-hidden="true">
          <span
            css={styles.operatorSegment}
            style={{ width: `${Math.max(operator.share * 100, operator.share > 0 ? 1 : 0)}%` }}
          />
        </span>
        <span css={styles.operatorMeta}>
          <FormattedMessage
            id="discover.queryProfile.rowsInOut"
            defaultMessage="{rowsIn} in, {rowsOut} out"
            values={{
              rowsIn: formatCount(operator.rowsReceived),
              rowsOut: formatCount(operator.rowsEmitted),
            }}
          />
          {hasRead ? (
            <>
              {' · '}
              <FormattedMessage
                id="discover.queryProfile.readSummary"
                defaultMessage="{stored} stored, {decoded} decoded{expansion} at {rate}"
                values={{
                  stored: formatBytes(operator.bytesRead ?? 0),
                  decoded: formatBytes(operator.bytesDecoded ?? 0),
                  expansion:
                    operator.expansion !== undefined
                      ? i18n.translate('discover.queryProfile.expansionClause', {
                          defaultMessage: ' ({expansion})',
                          values: { expansion: formatExpansion(operator.expansion) },
                        })
                      : '',
                  rate: formatThroughput(operator.throughputBytesPerSecond ?? 0),
                }}
              />
            </>
          ) : null}
        </span>
      </button>
      {isExpanded ? <OperatorDetails operator={operator} /> : null}
    </div>
  );
}

function OperatorDetails({ operator }: { operator: AggregatedOperator }) {
  return (
    <div data-test-subj="discoverQueryProfileOperatorDetails">
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{operator.operator}</p>
      </EuiText>
      {operator.drivers.map((driver) => (
        <EuiText key={driver.label} size="xs" color="subdued">
          <p>
            {i18n.translate('discover.queryProfile.driverLine', {
              defaultMessage: '{label}: {time}, {rowsIn} in, {rowsOut} out',
              values: {
                label: driver.label,
                time: formatDurationMillis(driver.processNanos / 1e6),
                rowsIn: formatCount(driver.rowsReceived),
                rowsOut: formatCount(driver.rowsEmitted),
              },
            })}
          </p>
        </EuiText>
      ))}
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
        {JSON.stringify(
          operator.drivers.map((driver) => ({ driver: driver.label, status: driver.rawStatus })),
          null,
          2
        )}
      </EuiCodeBlock>
    </div>
  );
}

const LegendSwatch = React.forwardRef<
  HTMLDivElement,
  { colorCss: ReturnType<typeof css>; label: string }
>(function LegendSwatch({ colorCss, label }, ref) {
  const { euiTheme } = useEuiTheme();
  return (
    <div ref={ref}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <span
            css={[
              colorCss,
              css`
                display: inline-block;
                width: ${euiTheme.size.s};
                height: ${euiTheme.size.s};
                border-radius: ${euiTheme.border.radius.small};
              `,
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <span>{label}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});

function durationAriaLabel(view: QueryProfileView): string {
  if (view.queryTookMillis === undefined) {
    return i18n.translate('discover.queryProfile.durationAriaUnknown', {
      defaultMessage: 'Query duration is unavailable',
    });
  }

  if (view.planningTookMillis === undefined || view.executionTookMillis === undefined) {
    return i18n.translate('discover.queryProfile.durationAriaTotal', {
      defaultMessage: 'Query took {time}',
      values: { time: formatDurationMillis(view.queryTookMillis) },
    });
  }

  return i18n.translate('discover.queryProfile.durationAriaSplit', {
    defaultMessage: 'Query took {time}. Planning {planning}, execution {execution}.',
    values: {
      time: formatDurationMillis(view.queryTookMillis),
      planning: formatDurationMillis(view.planningTookMillis),
      execution: formatDurationMillis(view.executionTookMillis),
    },
  });
}

function planningPhaseLabel(id: PlanningPhaseId): string {
  switch (id) {
    case 'parsing':
      return i18n.translate('discover.queryProfile.phaseParsing', { defaultMessage: 'Parsing' });
    case 'view_resolution':
      return i18n.translate('discover.queryProfile.phaseViewResolution', {
        defaultMessage: 'View resolution',
      });
    case 'dataset_resolution':
      return i18n.translate('discover.queryProfile.phaseDatasetResolution', {
        defaultMessage: 'Dataset resolution',
      });
    case 'preanalysis':
      return i18n.translate('discover.queryProfile.phasePreanalysis', {
        defaultMessage: 'Pre-analysis',
      });
    case 'indices_resolution':
      return i18n.translate('discover.queryProfile.phaseIndicesResolution', {
        defaultMessage: 'Index resolution',
      });
    case 'enrich_resolution':
      return i18n.translate('discover.queryProfile.phaseEnrichResolution', {
        defaultMessage: 'Enrich resolution',
      });
    case 'inference_resolution':
      return i18n.translate('discover.queryProfile.phaseInferenceResolution', {
        defaultMessage: 'Inference resolution',
      });
    case 'analysis':
      return i18n.translate('discover.queryProfile.phaseAnalysis', { defaultMessage: 'Analysis' });
  }
}

const useProfileStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    summaryTrack: css`
      display: flex;
      width: 100%;
      height: ${euiTheme.size.m};
      overflow: hidden;
      background: ${euiTheme.colors.backgroundBaseFormsControlDisabled};
      border-radius: ${euiTheme.border.radius.medium};
    `,
    track: css`
      display: flex;
      width: 100%;
      height: ${euiTheme.size.xs};
      margin-block: ${euiTheme.size.xs};
      overflow: hidden;
      background: ${euiTheme.colors.backgroundBaseFormsControlDisabled};
      border-radius: ${euiTheme.border.radius.medium};
    `,
    planningSegment: css`
      height: 100%;
      background: ${euiTheme.colors.warning};
    `,
    executionSegment: css`
      height: 100%;
      background: ${euiTheme.colors.primary};
    `,
    operatorSegment: css`
      height: 100%;
      background: ${euiTheme.colors.primary};
    `,
    planningSwatch: css`
      background: ${euiTheme.colors.warning};
    `,
    executionSwatch: css`
      background: ${euiTheme.colors.primary};
    `,
    operator: css`
      padding-bottom: ${euiTheme.size.m};
    `,
    operatorButton: css`
      display: block;
      width: 100%;
      padding: ${euiTheme.size.xs};
      margin: -${euiTheme.size.xs};
      text-align: start;
      background: transparent;
      border: none;
      border-radius: ${euiTheme.border.radius.medium};
      cursor: pointer;
      color: inherit;

      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `,
    operatorHeader: css`
      display: flex;
      align-items: flex-start;
      gap: ${euiTheme.size.s};
      min-width: 0;
    `,
    chevron: css`
      flex-shrink: 0;
      margin-top: 2px;
      color: ${euiTheme.colors.textSubdued};
    `,
    operatorName: css`
      min-width: 0;
      flex: 1;
    `,
    operatorTitle: css`
      display: block;
      overflow: hidden;
      font-weight: ${euiTheme.font.weight.bold};
      font-size: ${euiTheme.font.scale.s * euiTheme.base}px;
      line-height: 1.4;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    operatorDetail: css`
      display: block;
      overflow: hidden;
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      line-height: 1.4;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    operatorTime: css`
      flex-shrink: 0;
      min-width: ${euiTheme.base * 4}px;
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
      text-align: end;
    `,
    operatorShare: css`
      flex-shrink: 0;
      min-width: ${euiTheme.base * 3}px;
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-weight: ${euiTheme.font.weight.bold};
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
      text-align: end;
    `,
    operatorMeta: css`
      display: block;
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      line-height: 1.4;
    `,
  };
};
