/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
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

const TIMELINE_GROUP_ORDER = ['data', 'node_reduce', 'final'];

type TimelineZoom = { kind: 'query' } | { kind: 'planning' } | { kind: 'driver'; driverId: string };

export function QueryProfileBody({ view }: { view: QueryProfileView }) {
  return view.hasTimeline ? <TimelineProfile view={view} /> : <PipelineProfile view={view} />;
}

function PipelineProfile({ view }: { view: QueryProfileView }) {
  const [expandedOperator, setExpandedOperator] = useState<string | undefined>();
  const operators = [...view.operators].sort(
    (left, right) => left.pipelineIndex - right.pipelineIndex
  );

  return (
    <>
      <DurationBar view={view} />
      <EuiSpacer size="s" />
      <DriverCount count={view.driverCount} />
      {view.operators.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
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

function TimelineProfile({ view }: { view: QueryProfileView }) {
  const [zoom, setZoom] = useState<TimelineZoom>({ kind: 'query' });
  const [expandedOperator, setExpandedOperator] = useState<string | undefined>();
  const domain = zoomDomain(view.timeline, zoom);
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
      <EuiSpacer size="s" />
      <DriverCount count={view.driverCount} />
      <EuiSpacer size="xs" />
      <CpuTimeNote />
      <EuiSpacer size="m" />
      <TimelineLanes
        timeline={view.timeline}
        domain={domain}
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
          expandedOperator={expandedOperator}
          onToggle={setExpandedOperator}
        />
      ) : null}
      {zoom.kind === 'planning' ? <PlanningPhaseList view={view} /> : null}
      <PhysicalPlan plans={view.plans} />
    </>
  );
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
                defaultMessage="Profiled run"
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

function DriverCount({ count }: { count: number }) {
  return (
    <EuiText size="xs" color="subdued">
      <p>
        <FormattedMessage
          id="data.inspector.queryProfile.driverCountDescription"
          defaultMessage="{driverCount, plural, one {# driver} other {# drivers}}"
          values={{ driverCount: count }}
        />
      </p>
    </EuiText>
  );
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
  zoom,
  onSelectPlanning,
  onSelectDriver,
}: {
  timeline: QueryProfileTimeline;
  domain: { startMillis: number; stopMillis: number };
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
  const groups = groupDrivers(
    timeline.drivers.flatMap((driver) => {
      const box = laneBox(
        driver.startMillis,
        driver.stopMillis,
        domain.startMillis,
        domain.stopMillis
      );
      return box ? [{ driver, box }] : [];
    })
  );

  return (
    <div css={styles.lanes} data-test-subj="esqlQueryProfileTimeline">
      {planningBox && timeline.planning ? (
        <LaneButton
          label={i18n.translate('data.inspector.queryProfile.planningLaneLabel', {
            defaultMessage: 'Planning',
          })}
          time={formatDurationMillis(timeline.planning.stopMillis - timeline.planning.startMillis)}
          ariaLabel={i18n.translate('data.inspector.queryProfile.planningLaneAriaLabel', {
            defaultMessage: 'Planning, {time}',
            values: {
              time: formatDurationMillis(
                timeline.planning.stopMillis - timeline.planning.startMillis
              ),
            },
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
              label={driver.nodeName || driver.label}
              time={formatDurationMillis(driver.stopMillis - driver.startMillis)}
              ariaLabel={i18n.translate('data.inspector.queryProfile.timelineLaneAriaLabel', {
                defaultMessage: '{label}, {time}',
                values: {
                  label: driver.label,
                  time: formatDurationMillis(driver.stopMillis - driver.startMillis),
                },
              })}
              box={box}
              colorCss={styles.executionSegment}
              isSelected={zoom.kind === 'driver' && zoom.driverId === driver.id}
              onClick={() => onSelectDriver(driver.id)}
              driverLabel={driver.label}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function LaneButton({
  label,
  time,
  ariaLabel,
  box,
  colorCss,
  isSelected,
  onClick,
  driverLabel,
  testSubject = 'esqlQueryProfileLane',
}: {
  label: string;
  time: string;
  ariaLabel: string;
  box: { left: number; width: number };
  colorCss: ReturnType<typeof css>;
  isSelected: boolean;
  onClick: () => void;
  driverLabel?: string;
  testSubject?: string;
}) {
  const styles = useProfileStyles();

  return (
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
        />
      </span>
    </button>
  );
}

function DriverZoom({
  driver,
  expandedOperator,
  onToggle,
}: {
  driver: TimelineDriver;
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
            const time = formatDurationMillis(operator.processNanos / 1e6);
            const share = formatShare(operator.share);
            return (
              <button
                key={key}
                type="button"
                css={styles.stripStep}
                style={{ flexGrow: Math.max(operator.share * 100, 1) }}
                aria-expanded={expandedOperator === key}
                aria-label={i18n.translate('data.inspector.queryProfile.operatorButtonAriaLabel', {
                  defaultMessage: '{title}, {time}, {share}',
                  values: { title: operator.title, time, share },
                })}
                onClick={() => onToggle(expandedOperator === key ? undefined : key)}
                data-test-subj="esqlQueryProfileOperator"
              >
                <span css={styles.stripTitle}>{operator.title}</span>
                <span css={styles.stripShare}>{share}</span>
                <span
                  css={styles.stripBar}
                  style={{ background: shareColor(styles, operator.share) }}
                />
              </button>
            );
          })}
        </div>
      )}
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
      flex-basis: 0;
      gap: ${euiTheme.size.xs};
      min-width: ${euiTheme.base * 6}px;
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
