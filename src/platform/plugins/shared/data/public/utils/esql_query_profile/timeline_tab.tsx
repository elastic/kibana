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
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  PlanningPhaseId,
  QueryProfileTimeline,
  QueryProfileView,
  TimelineDriver,
  TimelineOperator,
  TimelineSleep,
} from './aggregate_esql_profile';
import { operatorCategory, useOperatorCategoryColors } from './operator_category';
import { computeTicks } from './timeline_ticks';
import { formatCount, formatDurationMillis, formatShare } from './profile_format';
import { LegendSwatch } from './legend_swatch';

const GROUP_ORDER = ['data', 'node_reduce', 'final'];

type Selection = { kind: 'planning' } | { kind: 'driver'; driverId: string };

interface LaneBox {
  left: number;
  width: number;
}

const planningLabel = () =>
  i18n.translate('data.inspector.queryProfile.planningLaneLabel', { defaultMessage: 'Planning' });

const groupLabel = (description: string): string => {
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
};

const planningPhaseLabel = (id: PlanningPhaseId): string => {
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
};

const operatorTimeLabel = (operator: TimelineOperator): string =>
  operator.timeReported ? formatDurationMillis(operator.processNanos / 1e6) : '–';

const operatorShareLabel = (operator: TimelineOperator): string =>
  operator.timeReported ? formatShare(operator.share) : '–';

const fullDomain = (
  timeline: QueryProfileTimeline
): { startMillis: number; stopMillis: number } => {
  const spans = [...(timeline.planning ? [timeline.planning] : []), ...timeline.drivers];
  return {
    startMillis: Math.min(...spans.map((span) => span.startMillis)),
    stopMillis: Math.max(...spans.map((span) => span.stopMillis)),
  };
};

/** Places a span on a track as percentages. Very short spans stay visible. */
const laneBox = (
  startMillis: number,
  stopMillis: number,
  domain: { startMillis: number; stopMillis: number }
): LaneBox => {
  const length = domain.stopMillis - domain.startMillis;
  if (length <= 0) {
    return { left: 0, width: 100 };
  }
  const width = Math.min(100, Math.max(((stopMillis - startMillis) / length) * 100, 1.5));
  const left = Math.min(
    Math.max(((startMillis - domain.startMillis) / length) * 100, 0),
    100 - width
  );
  return { left, width };
};

const groupDrivers = (drivers: TimelineDriver[]): Array<[string, TimelineDriver[]]> => {
  const groups = new Map<string, TimelineDriver[]>();
  drivers.forEach((driver) => {
    groups.set(driver.description, [...(groups.get(driver.description) ?? []), driver]);
  });
  const known = GROUP_ORDER.filter((description) => groups.has(description));
  const rest = [...groups.keys()].filter((description) => !GROUP_ORDER.includes(description));
  return [...known, ...rest].map((description) => [description, groups.get(description) ?? []]);
};

const useTimelineStyles = () => {
  const { euiTheme } = useEuiTheme();
  const small = `${euiTheme.font.scale.xs * euiTheme.base}px`;
  const labelColumn = `minmax(${euiTheme.base * 8}px, ${euiTheme.base * 12}px) 1fr`;

  return {
    lanes: css`
      max-height: ${euiTheme.base * 22}px;
      overflow-y: auto;
    `,
    ruler: css`
      position: sticky;
      top: 0;
      z-index: ${euiTheme.levels.content};
      display: grid;
      grid-template-columns: ${labelColumn};
      gap: ${euiTheme.size.s};
      padding: ${euiTheme.size.xs};
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
      font-size: ${small};
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
      white-space: nowrap;
    `,
    groupLabel: css`
      margin: ${euiTheme.size.s} 0 ${euiTheme.size.xs};
    `,
    lane: css`
      display: grid;
      grid-template-columns: ${labelColumn};
      align-items: center;
      gap: ${euiTheme.size.s};
      width: 100%;
      margin-bottom: ${euiTheme.size.xs};
      padding: ${euiTheme.size.xs};
      text-align: start;
      color: inherit;
      background: transparent;
      border: none;
      border-radius: ${euiTheme.border.radius.medium};
      cursor: pointer;

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
      font-size: ${small};
      line-height: 1.4;
    `,
    laneName: css`
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    laneTime: css`
      flex-shrink: 0;
      color: ${euiTheme.colors.textSubdued};
      font-variant-numeric: tabular-nums;
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
    laneWait: css`
      position: absolute;
      top: 0;
      bottom: 0;
      opacity: 0.85;
      pointer-events: none;
      background: repeating-linear-gradient(
        135deg,
        ${euiTheme.colors.backgroundBasePlain},
        ${euiTheme.colors.backgroundBasePlain} 3px,
        transparent 3px,
        transparent 6px
      );
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
    planningColor: css`
      background: ${euiTheme.colors.warning};
    `,
    groupColor: (description: string) =>
      css`
        background: ${description === 'node_reduce'
          ? euiTheme.colors.vis.euiColorVis3
          : description === 'final'
          ? euiTheme.colors.vis.euiColorVis5
          : euiTheme.colors.primary};
      `,
    strip: css`
      display: flex;
      gap: ${euiTheme.size.xs};
      overflow-x: auto;
    `,
    stripAnchor: css`
      display: flex;
      flex-basis: 0;
      min-width: ${euiTheme.base * 6}px;
    `,
    stripStep: css`
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: ${euiTheme.size.xs};
      padding: ${euiTheme.size.s};
      text-align: start;
      color: inherit;
      background: transparent;
      border: none;
      border-radius: ${euiTheme.border.radius.medium};
      cursor: pointer;

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
      font-size: ${small};
      font-variant-numeric: tabular-nums;
      line-height: 1.4;
    `,
    stripBar: css`
      height: ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.medium};
    `,
  };
};

const TimeRuler = ({ durationMillis }: { durationMillis: number }) => {
  const styles = useTimelineStyles();
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
};

const LaneTooltip = ({
  name,
  startMillis,
  durationMillis,
  driver,
}: {
  name: string;
  startMillis: number;
  durationMillis: number;
  driver?: TimelineDriver;
}) => {
  const waitedMillis = (driver?.sleeps ?? []).reduce(
    (sum: number, sleep: TimelineSleep) => sum + (sleep.stopMillis - sleep.startMillis),
    0
  );
  const reasons = [...new Set((driver?.sleeps ?? []).map((sleep) => sleep.reason).filter(Boolean))];
  const hasUnrecordedWaits = driver ? driver.sleepCount > driver.sleeps.length : false;

  return (
    <>
      <strong>{name}</strong>
      <div>
        {i18n.translate('data.inspector.queryProfile.laneTooltipTiming', {
          defaultMessage: 'Starts at +{start}, runs {duration}',
          values: {
            start: formatDurationMillis(Math.max(startMillis, 0)),
            duration: formatDurationMillis(durationMillis),
          },
        })}
      </div>
      {driver?.cpuNanos !== undefined ? (
        <div>
          {i18n.translate('data.inspector.queryProfile.laneTooltipCpu', {
            defaultMessage: 'CPU {cpu}',
            values: { cpu: formatDurationMillis(driver.cpuNanos / 1e6) },
          })}
        </div>
      ) : null}
      {driver && driver.sleeps.length > 0 ? (
        <div>
          {i18n.translate('data.inspector.queryProfile.laneTooltipWaiting', {
            defaultMessage: 'Waiting {atLeast}{time}{reasons}',
            values: {
              atLeast: hasUnrecordedWaits
                ? i18n.translate('data.inspector.queryProfile.laneTooltipAtLeast', {
                    defaultMessage: 'at least ',
                  })
                : '',
              time: formatDurationMillis(waitedMillis),
              reasons: reasons.length > 0 ? ` (${reasons.join(', ')})` : '',
            },
          })}
        </div>
      ) : null}
    </>
  );
};

const Lane = ({
  label,
  durationMillis,
  tooltip,
  box,
  waits = [],
  colorCss,
  isSelected,
  onClick,
  testSubject = 'esqlQueryProfileLane',
}: {
  label: string;
  durationMillis: number;
  tooltip: React.ReactNode;
  box: LaneBox;
  waits?: LaneBox[];
  colorCss: ReturnType<typeof css>;
  isSelected: boolean;
  onClick: () => void;
  testSubject?: string;
}) => {
  const styles = useTimelineStyles();
  const time = formatDurationMillis(durationMillis);

  return (
    <EuiToolTip content={tooltip} display="block" position="top">
      <button
        type="button"
        css={styles.lane}
        aria-label={i18n.translate('data.inspector.queryProfile.timelineLaneAriaLabel', {
          defaultMessage: '{label}, {time}',
          values: { label, time },
        })}
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
          />
          {waits.map((wait) => (
            <span
              key={`${wait.left}-${wait.width}`}
              css={styles.laneWait}
              style={{ left: `${wait.left}%`, width: `${wait.width}%` }}
              data-test-subj="esqlQueryProfileLaneWait"
            />
          ))}
        </span>
      </button>
    </EuiToolTip>
  );
};

const OperatorDetails = ({
  driver,
  operator,
}: {
  driver: TimelineDriver;
  operator: TimelineOperator;
}) => (
  <div data-test-subj="esqlQueryProfileOperatorDetails">
    <EuiSpacer size="s" />
    <EuiText size="xs" color="subdued">
      <p>{operator.operator}</p>
    </EuiText>
    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
      {JSON.stringify({ driver: driver.label, status: operator.rawStatus }, null, 2)}
    </EuiCodeBlock>
  </div>
);

/** An operator is hot when it is a large part of its driver and a real part of the whole query. */
const isHotOperator = (operator: TimelineOperator, totalOperatorNanos: number): boolean =>
  operator.share >= 0.25 &&
  totalOperatorNanos > 0 &&
  operator.processNanos / totalOperatorNanos >= 0.05;

const DriverOperators = ({
  driver,
  totalOperatorNanos,
}: {
  driver: TimelineDriver;
  totalOperatorNanos: number;
}) => {
  const styles = useTimelineStyles();
  const categoryColor = useOperatorCategoryColors();
  const [expandedKey, setExpandedKey] = useState<string | undefined>();
  const keyOf = (operator: TimelineOperator, index: number) => `${index}:${operator.operator}`;
  const expanded = driver.operators.find(
    (operator, index) => keyOf(operator, index) === expandedKey
  );

  return (
    <div data-test-subj="esqlQueryProfileDriverOperators">
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.driverCpuDescription"
            defaultMessage="CPU time inside {driver}. These widths are not wall-clock time."
            values={{ driver: driver.label }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {driver.operators.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="data.inspector.queryProfile.noOperatorsDescription"
              defaultMessage="This driver did not report any operators."
            />
          </p>
        </EuiText>
      ) : (
        <div css={styles.strip} data-test-subj="esqlQueryProfileOperatorStrip">
          {driver.operators.map((operator, index) => {
            const key = keyOf(operator, index);
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
                  aria-expanded={expandedKey === key}
                  aria-label={i18n.translate(
                    'data.inspector.queryProfile.operatorButtonAriaLabel',
                    {
                      defaultMessage: '{title}, {time}, {share}',
                      values: { title: operator.title, time, share },
                    }
                  )}
                  onClick={() => setExpandedKey(expandedKey === key ? undefined : key)}
                  data-test-subj="esqlQueryProfileOperator"
                >
                  <span css={styles.stripTitle}>{operator.title}</span>
                  <span css={styles.stripShare}>
                    {share}
                    {isHotOperator(operator, totalOperatorNanos) ? (
                      <EuiIcon
                        type="thermometer"
                        size="s"
                        color={operator.share >= 0.5 ? 'danger' : 'warning'}
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                  <span
                    css={styles.stripBar}
                    style={{ background: categoryColor[operatorCategory(operator.title)] }}
                  />
                </button>
              </EuiToolTip>
            );
          })}
        </div>
      )}
      {expanded ? <OperatorDetails driver={driver} operator={expanded} /> : null}
    </div>
  );
};

const PlanningPhases = ({ view }: { view: QueryProfileView }) => (
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

/** Every driver as a lane on one clock. Select a lane to see its operators or planning phases. */
export const TimelineTab = ({ view }: { view: QueryProfileView }) => {
  const styles = useTimelineStyles();
  const [selection, setSelection] = useState<Selection | undefined>();
  const { timeline } = view;
  const domain = fullDomain(timeline);
  const origin = domain.startMillis;
  const hasWaits = timeline.drivers.some((driver) => driver.sleeps.length > 0);
  const totalOperatorNanos = view.operators.reduce(
    (sum, operator) => sum + operator.processNanos,
    0
  );
  const selectedDriver =
    selection?.kind === 'driver'
      ? timeline.drivers.find((driver) => driver.id === selection.driverId)
      : undefined;
  const toggle = (next: Selection) =>
    setSelection((current) =>
      current?.kind === next.kind &&
      (next.kind === 'planning' ||
        (current.kind === 'driver' && current.driverId === next.driverId))
        ? undefined
        : next
    );

  return (
    <div data-test-subj="esqlQueryProfileTimeline">
      <div css={styles.lanes}>
        <TimeRuler durationMillis={domain.stopMillis - domain.startMillis} />
        {timeline.planning ? (
          <Lane
            label={planningLabel()}
            durationMillis={timeline.planning.stopMillis - timeline.planning.startMillis}
            tooltip={
              <LaneTooltip
                name={planningLabel()}
                startMillis={timeline.planning.startMillis - origin}
                durationMillis={timeline.planning.stopMillis - timeline.planning.startMillis}
              />
            }
            box={laneBox(timeline.planning.startMillis, timeline.planning.stopMillis, domain)}
            colorCss={styles.planningColor}
            isSelected={selection?.kind === 'planning'}
            onClick={() => toggle({ kind: 'planning' })}
            testSubject="esqlQueryProfilePlanningLane"
          />
        ) : null}
        {groupDrivers(timeline.drivers).map(([description, drivers]) => (
          <div key={description || 'other'}>
            <EuiText size="xs" color="subdued">
              <p css={styles.groupLabel}>{groupLabel(description)}</p>
            </EuiText>
            {drivers.map((driver) => (
              <Lane
                key={driver.id}
                label={driver.nodeName || driver.label}
                durationMillis={driver.stopMillis - driver.startMillis}
                tooltip={
                  <LaneTooltip
                    name={driver.label}
                    startMillis={driver.startMillis - origin}
                    durationMillis={driver.stopMillis - driver.startMillis}
                    driver={driver}
                  />
                }
                box={laneBox(driver.startMillis, driver.stopMillis, domain)}
                waits={driver.sleeps.map((sleep) =>
                  laneBox(sleep.startMillis, sleep.stopMillis, domain)
                )}
                colorCss={styles.groupColor(driver.description)}
                isSelected={selection?.kind === 'driver' && selection.driverId === driver.id}
                onClick={() => toggle({ kind: 'driver', driverId: driver.id })}
              />
            ))}
          </div>
        ))}
      </div>
      {hasWaits ? (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <LegendSwatch
                colorCss={styles.waitSwatch}
                label={i18n.translate('data.inspector.queryProfile.waitingLegendLabel', {
                  defaultMessage: 'Waiting, for example for another driver to send data',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
      {selectedDriver ? (
        <DriverOperators
          key={selectedDriver.id}
          driver={selectedDriver}
          totalOperatorNanos={totalOperatorNanos}
        />
      ) : null}
      {selection?.kind === 'planning' ? <PlanningPhases view={view} /> : null}
    </div>
  );
};
