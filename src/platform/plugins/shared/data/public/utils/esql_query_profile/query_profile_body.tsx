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
import type { EsqlProfilePlan } from '@kbn/es-types';
import type {
  AggregatedOperator,
  PlanningPhaseId,
  QueryProfileTimeline,
  QueryProfileView,
  TimelineDriver,
  TimelineOperator,
  TimelineSleep,
} from './aggregate_esql_profile';
import { OPERATOR_CATEGORIES, operatorCategory, operatorIconType } from './operator_icon';
import type { OperatorCategory } from './operator_icon';
import { deriveInsights, summarizeCpuByCategory } from './profile_insights';
import type { ProfileInsight } from './profile_insights';
import { findCriticalPath } from './critical_path';
import type { CriticalPath } from './critical_path';
import { useOperatorCategoryColors } from './operator_category_colors';
import { hasQueryHeat, QueryHeat } from './query_heat';
import { CpuSankeyTab, hasCpuSankey } from './cpu_sankey_chart';
import { buildPlanTree } from './plan_tree';
import { PlanTab } from './plan_tree_chart';
import { computeTicks } from './timeline_ticks';
import {
  formatBytes,
  formatCount,
  formatDurationMillis,
  formatExpansion,
  formatShare,
  formatThroughput,
} from './query_profile_format';

const TIMELINE_GROUP_ORDER = ['data', 'node_reduce', 'final'];

/** Names the group of drivers that decided when the query finished. It is not a driver description. */
const CRITICAL_GROUP = '__critical';

/** A wait is labeled when it spans at least this share of the track, so the label has room. */
const MIN_WAIT_LABEL_WIDTH = 18;

/** Says what a driver was waiting for, in the words of someone reading the lanes. */
function waitReasonLabel(reason: string): string {
  if (reason.includes('empty')) {
    return i18n.translate('data.inspector.queryProfile.waitForDataLabel', {
      defaultMessage: 'Waiting for data',
    });
  }
  if (reason.includes('full')) {
    return i18n.translate('data.inspector.queryProfile.waitBackPressureLabel', {
      defaultMessage: 'Back-pressure',
    });
  }
  return (
    reason || i18n.translate('data.inspector.queryProfile.waitLabel', { defaultMessage: 'Waiting' })
  );
}

type TimelineZoom = { kind: 'query' } | { kind: 'planning' } | { kind: 'driver'; driverId: string };

type TimelineTab = 'timeline' | 'operators' | 'query' | 'breakdown' | 'plan';

export function QueryProfileBody({
  view,
  query,
  canShowOnQuery = false,
}: {
  view: QueryProfileView;
  query?: string;
  /** Whether the query is the one in the editor, so its heat can be shown there. */
  canShowOnQuery?: boolean;
}) {
  return view.hasTimeline ? (
    <TimelineProfile view={view} query={query} canShowOnQuery={canShowOnQuery} />
  ) : (
    <PipelineProfile view={view} />
  );
}

function PipelineProfile({ view }: { view: QueryProfileView }) {
  const [expandedOperator, setExpandedOperator] = useState<string | undefined>();
  const operators = [...view.operators].sort(
    (left, right) => left.pipelineIndex - right.pipelineIndex
  );

  return (
    <>
      <DurationBar view={view} />
      {view.operators.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.planOrderDescription"
                defaultMessage="Steps follow the order they run. Open a step to see why it took time."
              />
            </p>
          </EuiText>
          <EuiSpacer size="xs" />
          <CpuTimeNote />
          <EuiSpacer size="m" />
          <ProfileSummary view={view} />
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
        <NoOperators />
      )}
      <PhysicalPlan plans={view.plans} />
    </>
  );
}

function TimelineProfile({
  view,
  query,
  canShowOnQuery,
}: {
  view: QueryProfileView;
  query?: string;
  canShowOnQuery: boolean;
}) {
  const [zoom, setZoom] = useState<TimelineZoom>({ kind: 'query' });
  const [tab, setTab] = useState<TimelineTab>('timeline');
  const [expandedOperator, setExpandedOperator] = useState<string | undefined>();
  const [expandedAggregate, setExpandedAggregate] = useState<string | undefined>();
  const domain = zoomDomain(view.timeline, zoom);
  const critical = useMemo(() => findCriticalPath(view), [view]);
  const planTree = useMemo(() => buildPlanTree(view), [view]);
  const selectedDriver =
    zoom.kind === 'driver'
      ? view.timeline.drivers.find((driver) => driver.id === zoom.driverId)
      : undefined;

  const zoomOut = () => {
    setZoom({ kind: 'query' });
    setExpandedOperator(undefined);
  };

  return (
    <>
      <DurationBar
        view={view}
        showSplit={false}
        crumb={
          zoom.kind === 'query' ? undefined : (
            <TimelineCrumb current={zoomCrumbLabel(zoom, selectedDriver)} onZoomOut={zoomOut} />
          )
        }
      />
      <EuiSpacer size="m" />
      <ProfileSummary view={view} showBreakdown={false} />
      <EuiButtonGroup
        legend={i18n.translate('data.inspector.queryProfile.tabsLegend', {
          defaultMessage: 'Profile view',
        })}
        buttonSize="compressed"
        idSelected={tab}
        onChange={(id) => setTab(id as TimelineTab)}
        options={[
          {
            id: 'timeline',
            label: i18n.translate('data.inspector.queryProfile.timelineTabLabel', {
              defaultMessage: 'Timeline',
            }),
            'data-test-subj': 'esqlQueryProfileTimelineTab',
          },
          ...(query && hasQueryHeat(view, query)
            ? [
                {
                  id: 'query',
                  label: i18n.translate('data.inspector.queryProfile.queryTabLabel', {
                    defaultMessage: 'By command',
                  }),
                  'data-test-subj': 'esqlQueryProfileQueryTab',
                },
              ]
            : []),
          ...(planTree
            ? [
                {
                  id: 'plan',
                  label: i18n.translate('data.inspector.queryProfile.planTabLabel', {
                    defaultMessage: 'Plan',
                  }),
                  'data-test-subj': 'esqlQueryProfilePlanTab',
                },
              ]
            : []),
          ...(hasCpuSankey(view)
            ? [
                {
                  id: 'breakdown',
                  label: i18n.translate('data.inspector.queryProfile.breakdownTabLabel', {
                    defaultMessage: 'CPU breakdown',
                  }),
                  'data-test-subj': 'esqlQueryProfileBreakdownTab',
                },
              ]
            : []),
          {
            id: 'operators',
            label: i18n.translate('data.inspector.queryProfile.operatorsTabLabel', {
              defaultMessage: 'Operators',
            }),
            'data-test-subj': 'esqlQueryProfileOperatorsTab',
          },
        ]}
      />
      <EuiSpacer size="m" />
      {tab === 'plan' && planTree ? (
        <PlanTab tree={planTree} />
      ) : tab === 'breakdown' ? (
        <CpuSankeyTab view={view} />
      ) : tab === 'query' && query ? (
        <QueryHeat view={view} query={query} canShowOnQuery={canShowOnQuery} />
      ) : tab === 'operators' ? (
        <>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.operatorsDescription"
                defaultMessage="Every operator as Elasticsearch reports it, summed over drivers. This list is exact, because nothing is matched to your query."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <ProfileSummary view={view} showInsights={false} />
          <CpuTimeNote />
          <EuiSpacer size="m" />
          <AggregatedOperators
            operators={view.operators}
            expandedOperator={expandedAggregate}
            onToggle={setExpandedAggregate}
          />
        </>
      ) : (
        <>
          <ProfileSummary view={view} showInsights={false} />
          <TimelineLanes
            timeline={view.timeline}
            domain={domain}
            critical={critical}
            zoom={zoom}
            onSelectPlanning={() => {
              setZoom({ kind: 'planning' });
              setExpandedOperator(undefined);
            }}
            onSelectDriver={(driverId) => {
              setZoom({ kind: 'driver', driverId });
              setExpandedOperator(undefined);
            }}
          />
          {selectedDriver ? (
            <DriverZoom
              driver={selectedDriver}
              totalOperatorNanos={view.operators.reduce(
                (sum, operator) => sum + operator.processNanos,
                0
              )}
              expandedOperator={expandedOperator}
              onToggle={setExpandedOperator}
            />
          ) : null}
          {zoom.kind === 'planning' ? <PlanningPhaseList view={view} /> : null}
        </>
      )}
      <PhysicalPlan plans={view.plans} />
    </>
  );
}

/** A CPU breakdown by kind of work, and the plain findings derived from the profile. */
function ProfileSummary({
  view,
  showBreakdown = true,
  showInsights = true,
}: {
  view: QueryProfileView;
  showBreakdown?: boolean;
  showInsights?: boolean;
}) {
  const styles = useProfileStyles();
  const breakdown = showBreakdown ? summarizeCpuByCategory(view.operators) : [];
  const insights = showInsights ? deriveInsights(view) : [];

  if (breakdown.length === 0 && insights.length === 0) {
    return null;
  }

  return (
    <>
      {breakdown.length > 0 ? (
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
          <div css={styles.summaryTrack} role="img" aria-label={cpuBreakdownAriaLabel(breakdown)}>
            {breakdown.map(({ category, share }) => (
              <div
                key={category}
                style={{
                  width: `${share * 100}%`,
                  background: styles.categoryColor[category],
                }}
              />
            ))}
          </div>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            {breakdown.map(({ category, share }) => (
              <EuiFlexItem grow={false} key={category}>
                <LegendSwatch
                  colorCss={css`
                    background: ${styles.categoryColor[category]};
                  `}
                  label={`${categoryLabel(category)} ${formatShare(share)}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </div>
      ) : null}
      {insights.length > 0 ? (
        <div data-test-subj="esqlQueryProfileInsights">
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="data.inspector.queryProfile.insightsTitle"
                defaultMessage="Insights"
              />
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {insights.map((insight, index) => (
            <EuiFlexGroup
              key={`${insight.kind}-${index}`}
              gutterSize="s"
              alignItems="baseline"
              responsive={false}
              data-test-subj="esqlQueryProfileInsight"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={insight.severity === 'warning' ? 'warning' : 'info'}
                  color={insight.severity === 'warning' ? 'warning' : 'subdued'}
                  size="s"
                  aria-hidden="true"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <p>{insightMessage(insight)}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
          <EuiSpacer size="m" />
        </div>
      ) : null}
    </>
  );
}

function cpuBreakdownAriaLabel(breakdown: ReturnType<typeof summarizeCpuByCategory>): string {
  return breakdown
    .map(({ category, share }) => `${categoryLabel(category)} ${formatShare(share)}`)
    .join(', ');
}

function insightMessage(insight: ProfileInsight): string {
  switch (insight.kind) {
    case 'dominantOperator':
      return i18n.translate('data.inspector.queryProfile.insightDominantOperator', {
        defaultMessage: '{title} takes {share} of the operator CPU time.',
        values: { title: insight.title, share: formatShare(insight.share) },
      });
    case 'planningHeavy':
      return i18n.translate('data.inspector.queryProfile.insightPlanningHeavy', {
        defaultMessage: 'Planning took {share} of the query time ({time}).',
        values: {
          share: formatShare(insight.share),
          time: formatDurationMillis(insight.planningMillis),
        },
      });
    case 'straggler':
      return insight.startedLate
        ? i18n.translate('data.inspector.queryProfile.insightStragglerStartedLate', {
            defaultMessage:
              'One {description} driver only started at +{start}, when the others were finishing, and the query waited {lag} longer for it. It was likely waiting for a free thread.',
            values: {
              description: insight.description,
              start: formatDurationMillis(insight.startMillis),
              lag: formatDurationMillis(insight.lagMillis),
            },
          })
        : i18n.translate('data.inspector.queryProfile.insightStraggler', {
            defaultMessage:
              'One {description} driver finished {lag} after the typical one, and the query waited for it. Speeding up the others would not make it faster.',
            values: {
              description: insight.description,
              lag: formatDurationMillis(insight.lagMillis),
            },
          });
    case 'driverSkew':
      return i18n.translate('data.inspector.queryProfile.insightDriverSkew', {
        defaultMessage:
          'The slowest {description} driver took {slowest}, against a median of {median}.',
        values: {
          description: descriptionGroupLabel(insight.description),
          slowest: formatDurationMillis(insight.slowestMillis),
          median: formatDurationMillis(insight.medianMillis),
        },
      });
    case 'driverWait': {
      const share = insight.atLeast
        ? i18n.translate('data.inspector.queryProfile.insightAtLeastShare', {
            defaultMessage: 'at least {share}',
            values: { share: formatShare(insight.share) },
          })
        : formatShare(insight.share);
      return insight.reason
        ? i18n.translate('data.inspector.queryProfile.insightDriverWaitWithReason', {
            defaultMessage: '{driver} waited {share} of its time ({reason}).',
            values: { driver: insight.driver, share, reason: insight.reason },
          })
        : i18n.translate('data.inspector.queryProfile.insightDriverWait', {
            defaultMessage: '{driver} waited {share} of its time.',
            values: { driver: insight.driver, share },
          });
    }
    case 'readExpansion':
      return i18n.translate('data.inspector.queryProfile.insightReadExpansion', {
        defaultMessage: '{title} decoded {decoded} from {stored} stored ({expansion}).',
        values: {
          title: insight.title,
          decoded: formatBytes(insight.decodedBytes),
          stored: formatBytes(insight.storedBytes),
          expansion: formatExpansion(insight.expansion),
        },
      });
    case 'lateFilter':
      return i18n.translate('data.inspector.queryProfile.insightLateFilter', {
        defaultMessage: '{title} kept {rowsOut} of {rowsIn} rows after they were loaded.',
        values: {
          title: insight.title,
          rowsOut: formatCount(insight.rowsOut),
          rowsIn: formatCount(insight.rowsIn),
        },
      });
  }
}

const NO_TIME_LABEL = '–';

function operatorTimeLabel(operator: { timeReported: boolean; processNanos: number }): string {
  return operator.timeReported ? formatDurationMillis(operator.processNanos / 1e6) : NO_TIME_LABEL;
}

function operatorShareLabel(operator: { timeReported: boolean; share: number }): string {
  return operator.timeReported ? formatShare(operator.share) : NO_TIME_LABEL;
}

/** Operators summed across all drivers, slowest first, like a bottom-up profile. */
function AggregatedOperators({
  operators,
  expandedOperator,
  onToggle,
}: {
  operators: AggregatedOperator[];
  expandedOperator: string | undefined;
  onToggle: (operator: string | undefined) => void;
}) {
  if (operators.length === 0) {
    return <NoOperators />;
  }

  const sorted = [...operators].sort((left, right) => right.processNanos - left.processNanos);

  return (
    <div data-test-subj="esqlQueryProfileOperatorsTable">
      {sorted.map((operator) => (
        <OperatorRow
          key={operator.operator}
          operator={operator}
          isExpanded={expandedOperator === operator.operator}
          onToggle={() =>
            onToggle(expandedOperator === operator.operator ? undefined : operator.operator)
          }
        />
      ))}
    </div>
  );
}

function TimeRuler({ durationMillis }: { durationMillis: number }) {
  const styles = useProfileStyles();
  const ticks = computeTicks(durationMillis);
  if (ticks.length === 0) {
    return null;
  }

  return (
    <div css={styles.ruler} aria-hidden="true" data-test-subj="esqlQueryProfileRuler">
      <span />
      <div css={styles.rulerTrack}>
        {ticks.map((tick) => {
          const left = (tick / durationMillis) * 100;
          const alignment =
            left === 0 ? 'none' : left > 85 ? 'translateX(-100%)' : 'translateX(-50%)';
          return (
            <span
              key={tick}
              css={styles.rulerTick}
              style={{ left: `${left}%`, transform: alignment }}
            >
              {formatDurationMillis(tick)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CategoryLegend({ categories }: { categories: OperatorCategory[] }) {
  const styles = useProfileStyles();
  const present = OPERATOR_CATEGORIES.filter((category) => categories.includes(category));

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap data-test-subj="esqlQueryProfileLegend">
      {present.map((category) => (
        <EuiFlexItem grow={false} key={category}>
          <LegendSwatch
            colorCss={css`
              background: ${styles.categoryColor[category]};
            `}
            label={categoryLabel(category)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function categoryLabel(category: OperatorCategory): string {
  switch (category) {
    case 'source':
      return i18n.translate('data.inspector.queryProfile.categorySourceLabel', {
        defaultMessage: 'Read',
      });
    case 'filter':
      return i18n.translate('data.inspector.queryProfile.categoryFilterLabel', {
        defaultMessage: 'Filter and limit',
      });
    case 'compute':
      return i18n.translate('data.inspector.queryProfile.categoryComputeLabel', {
        defaultMessage: 'Compute',
      });
    case 'aggregate':
      return i18n.translate('data.inspector.queryProfile.categoryAggregateLabel', {
        defaultMessage: 'Aggregate and sort',
      });
    case 'exchange':
      return i18n.translate('data.inspector.queryProfile.categoryExchangeLabel', {
        defaultMessage: 'Exchange',
      });
    case 'other':
      return i18n.translate('data.inspector.queryProfile.categoryOtherLabel', {
        defaultMessage: 'Other',
      });
  }
}

function DurationBar({
  view,
  showSplit = true,
  crumb,
}: {
  view: QueryProfileView;
  showSplit?: boolean;
  crumb?: React.ReactNode;
}) {
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
                id="data.inspector.queryProfile.profiledRunLabel"
                defaultMessage="Profiled run · {driverCount, plural, one {# driver} other {# drivers}}"
                values={{ driverCount: view.driverCount }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        {crumb ? (
          <EuiFlexItem>
            <div css={styles.crumbSlot}>{crumb}</div>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {showSplit ? (
        <>
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
  const time = operatorTimeLabel(operator);
  const share = operatorShareLabel(operator);
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
      {isExpanded ? (
        <OperatorDetails operator={operator.operator} drivers={operator.drivers} />
      ) : null}
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

function OperatorDetails({
  operator,
  drivers,
}: {
  operator: string;
  drivers: Array<{
    label: string;
    processNanos: number;
    rowsReceived: number;
    rowsEmitted: number;
    rawStatus: Record<string, unknown>;
  }>;
}) {
  return (
    <div data-test-subj="esqlQueryProfileOperatorDetails">
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{operator}</p>
      </EuiText>
      {drivers.map((driver) => (
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
          drivers.map((driver) => ({ driver: driver.label, status: driver.rawStatus })),
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

function TimelineCrumb({ current, onZoomOut }: { current: string; onZoomOut: () => void }) {
  const styles = useProfileStyles();

  return (
    <nav
      css={styles.crumb}
      aria-label={i18n.translate('data.inspector.queryProfile.timelineZoomAriaLabel', {
        defaultMessage: 'Timeline zoom',
      })}
    >
      <button
        type="button"
        css={styles.crumbAncestor}
        onClick={onZoomOut}
        data-test-subj="esqlQueryProfileZoomOut"
      >
        <FormattedMessage
          id="data.inspector.queryProfile.fullQueryButtonLabel"
          defaultMessage="Full query"
        />
      </button>
      <EuiIcon type="chevronSingleRight" size="s" color="subdued" aria-hidden={true} />
      <span css={styles.crumbCurrent}>{current}</span>
    </nav>
  );
}

function zoomCrumbLabel(zoom: TimelineZoom, driver: TimelineDriver | undefined): string {
  if (zoom.kind === 'planning') {
    return i18n.translate('data.inspector.queryProfile.planningLaneLabel', {
      defaultMessage: 'Planning',
    });
  }
  return driver?.nodeName || driver?.label || '';
}

function CpuTimeNote() {
  return (
    <EuiText size="xs" color="subdued">
      <p>
        <FormattedMessage
          id="data.inspector.queryProfile.cpuTimeDescription"
          defaultMessage="Operator times are CPU time summed across drivers, so they will not add up to the total query time."
        />
      </p>
    </EuiText>
  );
}

function NoOperators() {
  return (
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
  );
}

function PhysicalPlan({ plans }: { plans: EsqlProfilePlan[] }) {
  if (plans.length === 0) {
    return null;
  }

  return (
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
        {plans.map((plan, index) => (
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
  );
}

function TimelineLanes({
  timeline,
  domain,
  critical,
  zoom,
  onSelectPlanning,
  onSelectDriver,
}: {
  timeline: QueryProfileTimeline;
  domain: { startMillis: number; stopMillis: number };
  /** The drivers that decided when the query finished. The others are drawn in gray. */
  critical?: CriticalPath;
  zoom: TimelineZoom;
  onSelectPlanning: () => void;
  onSelectDriver: (driverId: string) => void;
}) {
  const styles = useProfileStyles();
  const planningBox = timeline.planning
    ? laneBox(
        timeline.planning.startMillis,
        timeline.planning.stopMillis,
        domain.startMillis,
        domain.stopMillis
      )
    : undefined;
  const entries = timeline.drivers.flatMap((driver) => {
    const box = laneBox(
      driver.startMillis,
      driver.stopMillis,
      domain.startMillis,
      domain.stopMillis
    );
    return box ? [{ driver, box }] : [];
  });
  // What the query waited for goes first, in the order it happened, so the story is not buried
  // under the lanes of drivers that did not decide anything.
  const criticalEntries = critical
    ? [...critical.driverIds]
        .reverse()
        .flatMap((id) => entries.filter((entry) => entry.driver.id === id))
    : [];
  const groups = [
    ...(criticalEntries.length > 0
      ? [{ description: CRITICAL_GROUP, drivers: criticalEntries }]
      : []),
    ...groupDrivers(entries.filter((entry) => !critical?.driverIds.includes(entry.driver.id))),
  ];

  const origin = fullDomain(timeline).startMillis;

  const hasWaits = timeline.drivers.some((driver) => driver.sleeps.length > 0);
  const isCritical = (driverId: string): boolean => critical?.driverIds.includes(driverId) ?? false;
  const hasOtherWork = critical ? timeline.drivers.some((driver) => !isCritical(driver.id)) : false;

  return (
    <>
      <div css={styles.lanes} data-test-subj="esqlQueryProfileTimeline">
        <TimeRuler durationMillis={domain.stopMillis - domain.startMillis} />
        {planningBox && timeline.planning ? (
          <LaneButton
            label={i18n.translate('data.inspector.queryProfile.planningLaneLabel', {
              defaultMessage: 'Planning',
            })}
            time={formatDurationMillis(
              timeline.planning.stopMillis - timeline.planning.startMillis
            )}
            ariaLabel={i18n.translate('data.inspector.queryProfile.planningLaneAriaLabel', {
              defaultMessage: 'Planning, {time}',
              values: {
                time: formatDurationMillis(
                  timeline.planning.stopMillis - timeline.planning.startMillis
                ),
              },
            })}
            tooltip={laneTooltip({
              name: i18n.translate('data.inspector.queryProfile.planningLaneLabel', {
                defaultMessage: 'Planning',
              }),
              startMillis: timeline.planning.startMillis - origin,
              durationMillis: timeline.planning.stopMillis - timeline.planning.startMillis,
            })}
            box={planningBox}
            colorCss={styles.planningSegment}
            isSelected={zoom.kind === 'planning'}
            onClick={onSelectPlanning}
            testSubject="esqlQueryProfilePlanningLane"
          />
        ) : null}
        {groups.map((group) => (
          <div key={group.description || 'other'}>
            <EuiText size="xs" color="subdued">
              <p css={styles.groupLabel}>{descriptionGroupLabel(group.description)}</p>
            </EuiText>
            {group.drivers.map(({ driver, box }) => (
              <LaneButton
                key={driver.id}
                // Drivers of different kinds sit together on the critical path, so they need their kind.
                label={
                  group.description === CRITICAL_GROUP
                    ? driver.label
                    : driver.nodeName || driver.label
                }
                time={formatDurationMillis(driver.stopMillis - driver.startMillis)}
                ariaLabel={i18n.translate('data.inspector.queryProfile.timelineLaneAriaLabel', {
                  defaultMessage: '{label}, {time}',
                  values: {
                    label: driver.label,
                    time: formatDurationMillis(driver.stopMillis - driver.startMillis),
                  },
                })}
                tooltip={laneTooltip({
                  name: driver.label,
                  startMillis: driver.startMillis - origin,
                  durationMillis: driver.stopMillis - driver.startMillis,
                  operatorCount: driver.operators.length,
                  cpuNanos: driver.cpuNanos,
                  sleeps: driver.sleeps,
                  sleepCount: driver.sleepCount,
                  criticalNote: critical
                    ? isCritical(driver.id)
                      ? i18n.translate('data.inspector.queryProfile.laneTooltipCritical', {
                          defaultMessage: 'On the critical path: the query waited for this driver',
                        })
                      : i18n.translate('data.inspector.queryProfile.laneTooltipNotCritical', {
                          defaultMessage:
                            'Ran at the same time but did not decide when the query finished',
                        })
                    : undefined,
                })}
                waits={driver.sleeps.flatMap((sleep) => {
                  const waitBox = laneBox(
                    sleep.startMillis,
                    sleep.stopMillis,
                    domain.startMillis,
                    domain.stopMillis
                  );
                  return waitBox
                    ? [
                        {
                          ...waitBox,
                          label: `${waitReasonLabel(sleep.reason)} ${formatDurationMillis(
                            sleep.stopMillis - sleep.startMillis
                          )}`,
                        },
                      ]
                    : [];
                })}
                box={box}
                isCritical={critical ? isCritical(driver.id) : undefined}
                colorCss={
                  critical
                    ? isCritical(driver.id)
                      ? styles.criticalColor
                      : styles.otherWorkColor
                    : styles.groupColor(group.description)
                }
                isSelected={zoom.kind === 'driver' && zoom.driverId === driver.id}
                onClick={() => onSelectDriver(driver.id)}
                driverLabel={driver.label}
              />
            ))}
          </div>
        ))}
      </div>
      {hasWaits || critical ? (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup
            gutterSize="m"
            responsive={false}
            wrap
            data-test-subj="esqlQueryProfileLaneLegend"
          >
            {critical ? (
              <EuiFlexItem grow={false}>
                <LegendSwatch
                  colorCss={styles.criticalSwatch}
                  label={i18n.translate('data.inspector.queryProfile.criticalLegendLabel', {
                    defaultMessage: 'Critical path: what the query waited for',
                  })}
                />
              </EuiFlexItem>
            ) : null}
            {hasOtherWork ? (
              <EuiFlexItem grow={false}>
                <LegendSwatch
                  colorCss={styles.otherWorkSwatch}
                  label={i18n.translate('data.inspector.queryProfile.otherWorkLegendLabel', {
                    defaultMessage:
                      'Other work: ran at the same time, but did not decide when the query finished',
                  })}
                />
              </EuiFlexItem>
            ) : null}
            {hasWaits ? (
              <EuiFlexItem grow={false}>
                <LegendSwatch
                  colorCss={styles.waitSwatch}
                  label={i18n.translate('data.inspector.queryProfile.waitingLegendLabel', {
                    defaultMessage: 'Waiting, for example for another driver to send data',
                  })}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
}

function laneTooltip({
  name,
  startMillis,
  durationMillis,
  operatorCount,
  cpuNanos,
  sleeps,
  sleepCount,
  criticalNote,
}: {
  name: string;
  startMillis: number;
  durationMillis: number;
  operatorCount?: number;
  cpuNanos?: number;
  sleeps?: TimelineSleep[];
  sleepCount?: number;
  /** Says whether the query waited for this driver, when that is known. */
  criticalNote?: string;
}): React.ReactNode {
  const waitedMillis = (sleeps ?? []).reduce(
    (sum, sleep) => sum + (sleep.stopMillis - sleep.startMillis),
    0
  );
  const reasons = [...new Set((sleeps ?? []).map((sleep) => sleep.reason).filter(Boolean))];
  return (
    <>
      <strong>{name}</strong>
      {criticalNote ? <div>{criticalNote}</div> : null}
      <div>
        {i18n.translate('data.inspector.queryProfile.laneTooltipTiming', {
          defaultMessage: 'Starts at +{start}, runs {duration}',
          values: {
            start: formatDurationMillis(Math.max(startMillis, 0)),
            duration: formatDurationMillis(durationMillis),
          },
        })}
      </div>
      {cpuNanos !== undefined ? (
        <div>
          {i18n.translate('data.inspector.queryProfile.laneTooltipCpu', {
            defaultMessage: 'CPU {cpu}',
            values: { cpu: formatDurationMillis(cpuNanos / 1e6) },
          })}
        </div>
      ) : null}
      {sleeps && sleeps.length > 0 ? (
        <div data-test-subj="esqlQueryProfileLaneWait">
          {i18n.translate('data.inspector.queryProfile.laneTooltipWaiting', {
            defaultMessage: 'Waiting {time}{reasons}',
            values: {
              time:
                (sleepCount ?? 0) > sleeps.length
                  ? i18n.translate('data.inspector.queryProfile.laneTooltipWaitingAtLeast', {
                      defaultMessage: 'at least {time}',
                      values: { time: formatDurationMillis(waitedMillis) },
                    })
                  : formatDurationMillis(waitedMillis),
              reasons: reasons.length > 0 ? ` (${reasons.join(', ')})` : '',
            },
          })}
        </div>
      ) : null}
      {operatorCount !== undefined ? (
        <div>
          {i18n.translate('data.inspector.queryProfile.laneTooltipOperators', {
            defaultMessage: '{count, plural, one {# operator} other {# operators}}',
            values: { count: operatorCount },
          })}
        </div>
      ) : null}
    </>
  );
}

function LaneButton({
  label,
  time,
  ariaLabel,
  tooltip,
  box,
  waits = [],
  isCritical,
  colorCss,
  isSelected,
  onClick,
  driverLabel,
  testSubject = 'esqlQueryProfileLane',
}: {
  label: string;
  time: string;
  ariaLabel: string;
  tooltip: React.ReactNode;
  box: { left: number; width: number };
  /** Stretches where the driver was waiting, as percentages of the track. */
  waits?: Array<{ left: number; width: number; label: string }>;
  /** Whether the query waited for this driver. Undefined when that is not known. */
  isCritical?: boolean;
  colorCss: ReturnType<typeof css>;
  isSelected: boolean;
  onClick: () => void;
  driverLabel?: string;
  testSubject?: string;
}) {
  const styles = useProfileStyles();

  return (
    <EuiToolTip content={tooltip} display="block" position="top">
      <button
        type="button"
        css={styles.laneButton}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        onClick={onClick}
        data-test-subj={testSubject}
      >
        <span css={styles.laneLabel}>
          <span css={styles.laneName}>{label}</span>
          <span css={styles.laneTime}>{time}</span>
        </span>
        <span css={styles.laneTrack}>
          <span
            css={[styles.laneBar, colorCss, isSelected ? styles.laneBarSelected : undefined]}
            style={{ left: `${box.left}%`, width: `${box.width}%` }}
            data-test-subj="esqlQueryProfileLaneBar"
            data-driver-label={driverLabel}
            data-critical={isCritical === undefined ? undefined : String(isCritical)}
          />
          {waits.map((wait) => (
            <span
              key={`${wait.left}-${wait.width}`}
              css={styles.laneWait}
              style={{ left: `${wait.left}%`, width: `${wait.width}%` }}
              data-test-subj="esqlQueryProfileLaneWaitSegment"
            >
              {wait.width >= MIN_WAIT_LABEL_WIDTH ? (
                <span css={styles.laneWaitLabel} data-test-subj="esqlQueryProfileLaneWaitLabel">
                  {wait.label}
                </span>
              ) : null}
            </span>
          ))}
        </span>
      </button>
    </EuiToolTip>
  );
}

function DriverZoom({
  driver,
  totalOperatorNanos,
  expandedOperator,
  onToggle,
}: {
  driver: TimelineDriver;
  /** CPU time of every operator in every driver, so a hot marker needs real weight in the query. */
  totalOperatorNanos: number;
  expandedOperator: string | undefined;
  onToggle: (operatorKey: string | undefined) => void;
}) {
  const styles = useProfileStyles();
  const expanded = driver.operators.find(
    (operator, index) => operatorKey(operator, index) === expandedOperator
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.driverCpuDescription"
            defaultMessage="CPU time inside this driver. These widths are not wall-clock time."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {driver.operators.length === 0 ? (
        <NoOperators />
      ) : (
        <div css={styles.operatorStrip} data-test-subj="esqlQueryProfileOperatorStrip">
          {driver.operators.map((operator, index) => {
            const key = operatorKey(operator, index);
            const time = operatorTimeLabel(operator);
            const share = operatorShareLabel(operator);
            return (
              <EuiToolTip
                key={key}
                position="top"
                anchorProps={{
                  css: styles.stripAnchor,
                  style: { flexGrow: Math.max(operator.share * 100, 1) },
                }}
                content={
                  <>
                    <strong>{operator.operator}</strong>
                    <div>
                      {operator.timeReported
                        ? i18n.translate('data.inspector.queryProfile.stripTooltipTiming', {
                            defaultMessage: '{time} CPU, {share} of this driver',
                            values: { time, share },
                          })
                        : i18n.translate('data.inspector.queryProfile.stripTooltipNoTime', {
                            defaultMessage: 'This operator does not report time',
                          })}
                    </div>
                    <div>
                      {i18n.translate('data.inspector.queryProfile.stripTooltipRows', {
                        defaultMessage: '{rowsIn} in, {rowsOut} out',
                        values: {
                          rowsIn: formatCount(operator.rowsReceived),
                          rowsOut: formatCount(operator.rowsEmitted),
                        },
                      })}
                    </div>
                  </>
                }
              >
                <button
                  type="button"
                  css={styles.stripStep}
                  aria-expanded={expandedOperator === key}
                  aria-label={i18n.translate(
                    'data.inspector.queryProfile.operatorButtonAriaLabel',
                    {
                      defaultMessage: '{title}, {time}, {share}',
                      values: { title: operator.title, time, share },
                    }
                  )}
                  onClick={() => onToggle(expandedOperator === key ? undefined : key)}
                  data-test-subj="esqlQueryProfileOperator"
                >
                  <span css={styles.stripTitle}>{operator.title}</span>
                  <span css={styles.stripShare}>
                    {share}
                    {isHotOperator(operator, totalOperatorNanos) ? (
                      <EuiIcon
                        type="temperature"
                        size="s"
                        color={operator.share >= 0.5 ? 'danger' : 'warning'}
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                  <span
                    css={styles.stripBar}
                    style={{ background: styles.categoryColor[operatorCategory(operator.title)] }}
                  />
                </button>
              </EuiToolTip>
            );
          })}
        </div>
      )}
      {driver.operators.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <CategoryLegend
            categories={driver.operators.map((operator) => operatorCategory(operator.title))}
          />
        </>
      ) : null}
      {expanded ? (
        <OperatorDetails
          operator={expanded.operator}
          drivers={[
            {
              label: driver.label,
              processNanos: expanded.processNanos,
              rowsReceived: expanded.rowsReceived,
              rowsEmitted: expanded.rowsEmitted,
              rawStatus: expanded.rawStatus,
            },
          ]}
        />
      ) : null}
    </>
  );
}

function PlanningPhaseList({ view }: { view: QueryProfileView }) {
  return (
    <div data-test-subj="esqlQueryProfilePlanningPhases">
      <EuiSpacer size="m" />
      {view.planningPhases.length === 0 ? (
        <EuiText size="xs" color="subdued">
          <p>
            <FormattedMessage
              id="data.inspector.queryProfile.planningZoomDescription"
              defaultMessage="Planning {time}"
              values={{ time: formatDurationMillis(view.planningTookMillis ?? 0) }}
            />
          </p>
        </EuiText>
      ) : (
        view.planningPhases.map((phase) => (
          <EuiText key={phase.id} size="xs">
            <p>
              {i18n.translate('data.inspector.queryProfile.planningPhaseLabel', {
                defaultMessage: '{phase} {time}',
                values: {
                  phase: planningPhaseLabel(phase.id),
                  time: formatDurationMillis(phase.tookMillis),
                },
              })}
            </p>
          </EuiText>
        ))
      )}
    </div>
  );
}

/**
 * Shares in a driver are relative to that driver, so an operator can be 100% of a driver that took
 * microseconds. It only counts as hot when it also carries a real part of the whole query's CPU time.
 */
function isHotOperator(operator: TimelineOperator, totalOperatorNanos: number): boolean {
  return (
    operator.share >= 0.25 &&
    totalOperatorNanos > 0 &&
    operator.processNanos / totalOperatorNanos >= 0.05
  );
}

function operatorKey(operator: TimelineOperator, index: number): string {
  return `${index}:${operator.operator}`;
}

function zoomDomain(
  timeline: QueryProfileTimeline,
  zoom: TimelineZoom
): { startMillis: number; stopMillis: number } {
  if (zoom.kind === 'planning' && timeline.planning) {
    return timeline.planning;
  }
  if (zoom.kind === 'driver') {
    const driver = timeline.drivers.find((item) => item.id === zoom.driverId);
    if (driver) {
      return { startMillis: driver.startMillis, stopMillis: driver.stopMillis };
    }
  }
  return fullDomain(timeline);
}

function fullDomain(timeline: QueryProfileTimeline): { startMillis: number; stopMillis: number } {
  const spans = [...(timeline.planning ? [timeline.planning] : []), ...timeline.drivers];
  if (spans.length === 0) {
    return { startMillis: 0, stopMillis: 0 };
  }
  return {
    startMillis: Math.min(...spans.map((span) => span.startMillis)),
    stopMillis: Math.max(...spans.map((span) => span.stopMillis)),
  };
}

function laneBox(
  startMillis: number,
  stopMillis: number,
  domainStart: number,
  domainEnd: number
): { left: number; width: number } | undefined {
  const selected = startMillis === domainStart && stopMillis === domainEnd;
  const domain = domainEnd - domainStart;
  if (domain <= 0) {
    return selected ? { left: 0, width: 100 } : undefined;
  }

  const start = Math.max(startMillis, domainStart);
  const stop = Math.min(stopMillis, domainEnd);
  if (stop <= start) {
    return selected ? { left: 0, width: 100 } : undefined;
  }

  const left = ((start - domainStart) / domain) * 100;
  const width = ((stop - start) / domain) * 100;
  const clampedWidth = Math.min(100, Math.max(width, 1.5));
  const clampedLeft = Math.min(Math.max(left, 0), 100 - clampedWidth);
  return { left: clampedLeft, width: clampedWidth };
}

function groupDrivers(
  entries: Array<{ driver: TimelineDriver; box: { left: number; width: number } }>
): Array<{
  description: string;
  drivers: Array<{ driver: TimelineDriver; box: { left: number; width: number } }>;
}> {
  const groups = new Map<
    string,
    Array<{ driver: TimelineDriver; box: { left: number; width: number } }>
  >();
  entries.forEach((entry) => {
    const current = groups.get(entry.driver.description) ?? [];
    current.push(entry);
    groups.set(entry.driver.description, current);
  });

  const known = TIMELINE_GROUP_ORDER.filter((description) => groups.has(description));
  const rest = [...groups.keys()].filter(
    (description) => !TIMELINE_GROUP_ORDER.includes(description)
  );
  return [...known, ...rest].map((description) => ({
    description,
    drivers: groups.get(description) ?? [],
  }));
}

function descriptionGroupLabel(description: string): string {
  switch (description) {
    case CRITICAL_GROUP:
      return i18n.translate('data.inspector.queryProfile.criticalDriversLabel', {
        defaultMessage: 'Critical path',
      });
    case 'data':
      return i18n.translate('data.inspector.queryProfile.dataDriversLabel', {
        defaultMessage: 'Data',
      });
    case 'node_reduce':
      return i18n.translate('data.inspector.queryProfile.nodeReduceDriversLabel', {
        defaultMessage: 'Node reduce',
      });
    case 'final':
      return i18n.translate('data.inspector.queryProfile.finalDriversLabel', {
        defaultMessage: 'Final',
      });
    case '':
      return i18n.translate('data.inspector.queryProfile.otherDriversLabel', {
        defaultMessage: 'Other',
      });
    default:
      return description;
  }
}

const useProfileStyles = () => {
  const { euiTheme } = useEuiTheme();
  const categoryColor = useOperatorCategoryColors();

  return {
    hot: euiTheme.colors.danger,
    warm: euiTheme.colors.warning,
    cool: euiTheme.colors.primary,
    categoryColor,
    groupColor: (description: string) =>
      css`
        height: 100%;
        background: ${description === 'node_reduce'
          ? euiTheme.colors.vis.euiColorVis3
          : description === 'final'
          ? euiTheme.colors.vis.euiColorVis5
          : euiTheme.colors.primary};
      `,
    ruler: css`
      position: sticky;
      top: 0;
      z-index: ${euiTheme.levels.content};
      display: grid;
      grid-template-columns: minmax(${euiTheme.base * 9}px, ${euiTheme.base * 14}px) 1fr;
      gap: ${euiTheme.size.s};
      padding: ${euiTheme.size.xs};
      padding-inline-end: ${euiTheme.size.l};
      background: ${euiTheme.colors.backgroundBasePlain};
    `,
    rulerTrack: css`
      position: relative;
      height: ${euiTheme.size.base};
      border-bottom: ${euiTheme.border.thin};
    `,
    rulerTick: css`
      position: absolute;
      top: 0;
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
      white-space: nowrap;
    `,
    stripAnchor: css`
      display: flex;
      flex-basis: 0;
      min-width: ${euiTheme.base * 6}px;
    `,
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
    crumbSlot: css`
      display: flex;
      justify-content: flex-end;
      min-width: 0;
    `,
    crumb: css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      min-width: 0;
    `,
    crumbAncestor: css`
      flex-shrink: 0;
      padding: 0;
      color: ${euiTheme.colors.primary};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-weight: ${euiTheme.font.weight.medium};
      line-height: 1.4;
      background: transparent;
      border: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    `,
    crumbCurrent: css`
      overflow: hidden;
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-weight: ${euiTheme.font.weight.bold};
      line-height: 1.4;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    lanes: css`
      max-height: ${euiTheme.base * 20}px;
      overflow-y: auto;
    `,
    groupLabel: css`
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.xs};
    `,
    laneButton: css`
      display: grid;
      grid-template-columns: minmax(${euiTheme.base * 9}px, ${euiTheme.base * 14}px) 1fr;
      align-items: center;
      gap: ${euiTheme.size.s};
      width: 100%;
      margin-bottom: ${euiTheme.size.xs};
      padding: ${euiTheme.size.xs};
      text-align: start;
      background: transparent;
      border: none;
      border-radius: ${euiTheme.border.radius.medium};
      cursor: pointer;
      color: inherit;

      &:hover,
      &[aria-pressed='true'] {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `,
    laneLabel: css`
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: ${euiTheme.size.s};
      min-width: 0;
    `,
    laneName: css`
      overflow: hidden;
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      line-height: 1.4;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    laneTime: css`
      flex-shrink: 0;
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
    `,
    laneTrack: css`
      position: relative;
      height: ${euiTheme.size.m};
      overflow: hidden;
      background: ${euiTheme.colors.backgroundBaseFormsControlDisabled};
      border-radius: ${euiTheme.border.radius.medium};
    `,
    laneBar: css`
      position: absolute;
      top: 0;
      bottom: 0;
    `,
    laneWait: css`
      position: absolute;
      top: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        135deg,
        ${euiTheme.colors.backgroundBasePlain},
        ${euiTheme.colors.backgroundBasePlain} 3px,
        transparent 3px,
        transparent 6px
      );
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.85;
      pointer-events: none;
    `,
    criticalColor: css`
      height: 100%;
      background: ${euiTheme.colors.danger};
    `,
    otherWorkColor: css`
      height: 100%;
      background: ${euiTheme.colors.mediumShade};
    `,
    criticalSwatch: css`
      background: ${euiTheme.colors.danger};
    `,
    otherWorkSwatch: css`
      background: ${euiTheme.colors.mediumShade};
    `,
    laneWaitLabel: css`
      max-width: 100%;
      padding: 0 ${euiTheme.size.xs};
      overflow: hidden;
      color: ${euiTheme.colors.textParagraph};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      line-height: ${euiTheme.size.m};
      white-space: nowrap;
      text-overflow: ellipsis;
      background: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.small};
    `,
    waitSwatch: css`
      background: repeating-linear-gradient(
        135deg,
        ${euiTheme.colors.lightShade},
        ${euiTheme.colors.lightShade} 2px,
        ${euiTheme.colors.backgroundBasePlain} 2px,
        ${euiTheme.colors.backgroundBasePlain} 4px
      );
    `,
    laneBarSelected: css`
      box-shadow: inset 0 0 0 2px ${euiTheme.colors.text};
    `,
    operatorStrip: css`
      display: flex;
      gap: ${euiTheme.size.xs};
      overflow-x: auto;
    `,
    stripStep: css`
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: ${euiTheme.size.xs};
      padding: ${euiTheme.size.s};
      text-align: start;
      background: transparent;
      border: none;
      border-radius: ${euiTheme.border.radius.medium};
      cursor: pointer;
      color: inherit;

      &:hover,
      &[aria-expanded='true'] {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `,
    stripTitle: css`
      overflow: hidden;
      font-weight: ${euiTheme.font.weight.bold};
      font-size: ${euiTheme.font.scale.s * euiTheme.base}px;
      line-height: 1.4;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    stripShare: css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
    `,
    stripBar: css`
      height: ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.medium};
    `,
  };
};
