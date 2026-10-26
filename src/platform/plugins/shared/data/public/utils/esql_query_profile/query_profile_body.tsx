/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  AggregatedOperator,
  PlanningPhaseId,
  QueryProfileView,
} from './aggregate_esql_profile';
import { operatorIconType } from './operator_icon';
import {
  formatBytes,
  formatCount,
  formatDurationMillis,
  formatExpansion,
  formatShare,
  formatThroughput,
} from './query_profile_format';

type SortMode = 'slowest' | 'pipeline';

export function QueryProfileBody({ view }: { view: QueryProfileView }) {
  const [sortMode, setSortMode] = useState<SortMode>('slowest');
  const [expandedOperator, setExpandedOperator] = useState<string | undefined>();
  const operators = useMemo(
    () => sortOperators(view.operators, sortMode),
    [view.operators, sortMode]
  );

  return (
    <>
      <DurationBar view={view} />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.driverCountDescription"
            defaultMessage="{driverCount, plural, one {# driver} other {# drivers}}"
            values={{ driverCount: view.driverCount }}
          />
        </p>
      </EuiText>
      {view.operators.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.cpuTimeDescription"
                defaultMessage="Operator times are CPU time summed across drivers, so they will not add up to the total query time."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButtonGroup
            legend={i18n.translate('data.inspector.queryProfile.operatorOrderLabel', {
              defaultMessage: 'Operator order',
            })}
            options={[
              {
                id: 'slowest',
                label: i18n.translate('data.inspector.queryProfile.slowestFirstButtonLabel', {
                  defaultMessage: 'Slowest first',
                }),
              },
              {
                id: 'pipeline',
                label: i18n.translate('data.inspector.queryProfile.pipelineOrderButtonLabel', {
                  defaultMessage: 'Pipeline order',
                }),
              },
            ]}
            idSelected={sortMode}
            onChange={(id) => {
              if (id === 'slowest' || id === 'pipeline') {
                setSortMode(id);
              }
            }}
            buttonSize="compressed"
            data-test-subj="esqlQueryProfileSort"
          />
          <EuiSpacer size="l" />
          {operators.map((operator) => (
            <OperatorRow
              key={operator.operator}
              operator={operator}
              isExpanded={expandedOperator === operator.operator}
              onToggle={() =>
                setExpandedOperator((current) =>
                  current === operator.operator ? undefined : operator.operator
                )
              }
            />
          ))}
        </>
      ) : (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.noOperatorsDescription"
                defaultMessage="This profile did not include any operators."
              />
            </p>
          </EuiText>
        </>
      )}
      {view.plans.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="esqlQueryProfilePlan"
            buttonContent={i18n.translate('data.inspector.queryProfile.physicalPlanButtonLabel', {
              defaultMessage: 'Physical plan',
            })}
            data-test-subj="esqlQueryProfilePlan"
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

function sortOperators(operators: AggregatedOperator[], sortMode: SortMode): AggregatedOperator[] {
  return [...operators].sort((left, right) =>
    sortMode === 'pipeline'
      ? left.pipelineIndex - right.pipelineIndex
      : right.processNanos - left.processNanos || left.pipelineIndex - right.pipelineIndex
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
    <div data-test-subj="esqlQueryProfileDuration">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {view.queryTookMillis !== undefined
                ? formatDurationMillis(view.queryTookMillis)
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
                id="data.inspector.queryProfile.totalTimeLabel"
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
                  label={i18n.translate('data.inspector.queryProfile.planningLegendLabel', {
                    defaultMessage: 'Planning {time}',
                    values: { time: formatDurationMillis(planning ?? 0) },
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LegendSwatch
                colorCss={styles.executionSwatch}
                label={i18n.translate('data.inspector.queryProfile.executionLegendLabel', {
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
        id="data.inspector.queryProfile.planningTooltip"
        defaultMessage="Planning {time}"
        values={{ time: formatDurationMillis(view.planningTookMillis ?? 0) }}
      />
    );
  }

  return (
    <>
      {view.planningPhases.map((phase) => (
        <div key={phase.id}>
          {i18n.translate('data.inspector.queryProfile.planningPhaseLabel', {
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
    <div css={styles.operator} data-test-subj="esqlQueryProfileOperator">
      <button
        type="button"
        css={styles.operatorButton}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={i18n.translate('data.inspector.queryProfile.operatorButtonAriaLabel', {
          defaultMessage: '{title}, {time}, {share}',
          values: { title: operator.title, time, share },
        })}
      >
        <span css={styles.operatorHeader}>
          <span css={styles.operatorIcons}>
            <EuiIcon
              type={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
              size="s"
              color="subdued"
              aria-hidden="true"
            />
            <EuiIcon
              type={operatorIconType(operator.title)}
              size="m"
              color="subdued"
              aria-hidden="true"
            />
          </span>
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
            style={{
              width: `${Math.max(operator.share * 100, operator.share > 0 ? 1 : 0)}%`,
              background: shareColor(styles, operator.share),
            }}
          />
        </span>
        <span css={styles.operatorMeta}>
          <FormattedMessage
            id="data.inspector.queryProfile.rowsInOutLabel"
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
                id="data.inspector.queryProfile.readSummaryLabel"
                defaultMessage="{stored} stored, {decoded} decoded{expansion} at {rate}"
                values={{
                  stored: formatBytes(operator.bytesRead ?? 0),
                  decoded: formatBytes(operator.bytesDecoded ?? 0),
                  expansion:
                    operator.expansion !== undefined
                      ? i18n.translate('data.inspector.queryProfile.expansionClauseLabel', {
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

function shareColor(styles: ReturnType<typeof useProfileStyles>, share: number): string {
  if (share >= 0.5) {
    return styles.hot;
  }
  if (share >= 0.25) {
    return styles.warm;
  }
  return styles.cool;
}

function OperatorDetails({ operator }: { operator: AggregatedOperator }) {
  return (
    <div data-test-subj="esqlQueryProfileOperatorDetails">
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{operator.operator}</p>
      </EuiText>
      {operator.drivers.map((driver) => (
        <EuiText key={driver.label} size="xs" color="subdued">
          <p>
            {i18n.translate('data.inspector.queryProfile.driverLineLabel', {
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
    return i18n.translate('data.inspector.queryProfile.durationUnknownAriaLabel', {
      defaultMessage: 'Query duration is unavailable',
    });
  }

  if (view.planningTookMillis === undefined || view.executionTookMillis === undefined) {
    return i18n.translate('data.inspector.queryProfile.durationTotalAriaLabel', {
      defaultMessage: 'Query took {time}',
      values: { time: formatDurationMillis(view.queryTookMillis) },
    });
  }

  return i18n.translate('data.inspector.queryProfile.durationSplitAriaLabel', {
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
      return i18n.translate('data.inspector.queryProfile.phaseParsingLabel', {
        defaultMessage: 'Parsing',
      });
    case 'view_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseViewResolutionLabel', {
        defaultMessage: 'View resolution',
      });
    case 'dataset_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseDatasetResolutionLabel', {
        defaultMessage: 'Dataset resolution',
      });
    case 'preanalysis':
      return i18n.translate('data.inspector.queryProfile.phasePreanalysisLabel', {
        defaultMessage: 'Pre-analysis',
      });
    case 'indices_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseIndicesResolutionLabel', {
        defaultMessage: 'Index resolution',
      });
    case 'enrich_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseEnrichResolutionLabel', {
        defaultMessage: 'Enrich resolution',
      });
    case 'inference_resolution':
      return i18n.translate('data.inspector.queryProfile.phaseInferenceResolutionLabel', {
        defaultMessage: 'Inference resolution',
      });
    case 'analysis':
      return i18n.translate('data.inspector.queryProfile.phaseAnalysisLabel', {
        defaultMessage: 'Analysis',
      });
  }
}

const useProfileStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    hot: euiTheme.colors.danger,
    warm: euiTheme.colors.warning,
    cool: euiTheme.colors.primary,
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
      height: ${euiTheme.size.s};
      margin-block: ${euiTheme.size.s};
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
    `,
    planningSwatch: css`
      background: ${euiTheme.colors.warning};
    `,
    executionSwatch: css`
      background: ${euiTheme.colors.primary};
    `,
    operator: css`
      padding-bottom: ${euiTheme.size.l};
    `,
    operatorButton: css`
      display: block;
      width: 100%;
      padding: ${euiTheme.size.s};
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
      align-items: center;
      gap: ${euiTheme.size.m};
      min-width: 0;
    `,
    operatorIcons: css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: ${euiTheme.size.s};
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
      margin-top: ${euiTheme.size.xs};
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
