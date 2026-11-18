/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { SerializedStyles } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ticks as niceTicks } from 'd3-array';
import type { QueryProfileView, TimelineDriver } from './types';
import { formatDurationMillis } from './profile_format';
import { LegendSwatch } from './legend_swatch';
import { groupLabel, planningLabel, spreadLabel } from './timeline_labels';
import { TimelineDetails } from './timeline_details';
import type { LaneBox } from './timeline_layout';
import { driverSpread, fullDomain, groupDrivers, laneBox, spanMillis } from './timeline_layout';
import { useTimelineStyles } from './timeline_styles';

/** The id of the selected lane. Drivers use their own id, which is never this one. */
const PLANNING_LANE_ID = 'planning';

/** About this many labels on the ruler. The steps are 1, 2 or 5 times a power of ten. */
const RULER_TICK_COUNT = 3;

const TimeRuler = ({ durationMillis }: { durationMillis: number }) => {
  const styles = useTimelineStyles();
  const ticks = durationMillis > 0 ? niceTicks(0, durationMillis, RULER_TICK_COUNT) : [];
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
            defaultMessage:
              '{isLowerBound, select, true {Waiting at least {time}} other {Waiting {time}}}{hasReasons, select, true { ({reasons})} other {}}',
            values: {
              isLowerBound: hasUnrecordedWaits,
              time: formatDurationMillis(driver.waitedMillis),
              hasReasons: reasons.length > 0,
              reasons: reasons.join(', '),
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
  colorCss: SerializedStyles;
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
          {waits.map((wait, index) => (
            <span
              key={`${index}-${wait.left}-${wait.width}`}
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

const GroupHeader = ({
  description,
  drivers,
}: {
  description: string;
  drivers: TimelineDriver[];
}) => {
  const styles = useTimelineStyles();
  const spread = useMemo(() => driverSpread(drivers), [drivers]);

  return (
    <EuiText size="xs" color="subdued">
      <p css={styles.groupLabel} data-test-subj="esqlQueryProfileGroupHeader">
        {groupLabel(description)}
        {spread ? ` · ${spreadLabel(spread)}` : ''}
        {spread?.isSkewed ? (
          <EuiIconTip
            type="warning"
            color="warning"
            size="s"
            aria-label={i18n.translate('data.inspector.queryProfile.skewedGroupAriaLabel', {
              defaultMessage: 'Uneven durations',
            })}
            content={i18n.translate('data.inspector.queryProfile.skewedGroupTooltip', {
              defaultMessage:
                'The slowest driver took {max}, much longer than the typical {median}. One node may hold more data or be slower than the others.',
              values: {
                max: formatDurationMillis(spread.maxMillis),
                median: formatDurationMillis(spread.medianMillis),
              },
            })}
          />
        ) : null}
      </p>
    </EuiText>
  );
};

/** Every driver as a lane on one clock. Select a lane to see its details below. */
export const TimelineTab = ({ view }: { view: QueryProfileView }) => {
  const styles = useTimelineStyles();
  const [selectedLaneId, setSelectedLaneId] = useState<string | undefined>();
  const [selectedOperatorKey, setSelectedOperatorKey] = useState<string | undefined>();
  const [isScrolled, setIsScrolled] = useState(false);
  const { timeline } = view;
  const domain = useMemo(() => fullDomain(timeline), [timeline]);
  const origin = domain.startMillis;
  const groups = useMemo(() => groupDrivers(timeline.drivers), [timeline.drivers]);
  const hasWaits = useMemo(
    () => timeline.drivers.some((driver) => driver.sleeps.length > 0),
    [timeline.drivers]
  );
  const totalOperatorNanos = useMemo(
    () => view.operators.reduce((sum, operator) => sum + operator.processNanos, 0),
    [view.operators]
  );
  const selectedDriver = timeline.drivers.find((driver) => driver.id === selectedLaneId);
  const toggle = (laneId: string) => {
    setSelectedLaneId((current) => (current === laneId ? undefined : laneId));
    setSelectedOperatorKey(undefined);
  };

  return (
    <div data-test-subj="esqlQueryProfileTimeline">
      <div
        css={styles.lanes}
        data-scrolled={isScrolled}
        onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 0)}
      >
        <TimeRuler durationMillis={spanMillis(domain)} />
        {timeline.planning ? (
          <Lane
            label={planningLabel()}
            durationMillis={spanMillis(timeline.planning)}
            tooltip={
              <LaneTooltip
                name={planningLabel()}
                startMillis={timeline.planning.startMillis - origin}
                durationMillis={spanMillis(timeline.planning)}
              />
            }
            box={laneBox(timeline.planning.startMillis, timeline.planning.stopMillis, domain)}
            colorCss={styles.planningColor}
            isSelected={selectedLaneId === PLANNING_LANE_ID}
            onClick={() => toggle(PLANNING_LANE_ID)}
            testSubject="esqlQueryProfilePlanningLane"
          />
        ) : null}
        {groups.map(([description, drivers]) => (
          <div key={description || 'other'}>
            <GroupHeader description={description} drivers={drivers} />
            {drivers.map((driver) => (
              <Lane
                key={driver.id}
                label={driver.nodeName || driver.label}
                durationMillis={spanMillis(driver)}
                tooltip={
                  <LaneTooltip
                    name={driver.label}
                    startMillis={driver.startMillis - origin}
                    durationMillis={spanMillis(driver)}
                    driver={driver}
                  />
                }
                box={laneBox(driver.startMillis, driver.stopMillis, domain)}
                waits={driver.sleeps.map((sleep) =>
                  laneBox(sleep.startMillis, sleep.stopMillis, domain)
                )}
                colorCss={styles.groupColor(driver.description)}
                isSelected={selectedLaneId === driver.id}
                onClick={() => toggle(driver.id)}
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
      <TimelineDetails
        view={view}
        driver={selectedDriver}
        isPlanningSelected={selectedLaneId === PLANNING_LANE_ID}
        origin={origin}
        totalOperatorNanos={totalOperatorNanos}
        selectedOperatorKey={selectedOperatorKey}
        onSelectOperator={setSelectedOperatorKey}
      />
    </div>
  );
};
