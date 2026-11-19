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
import type { QueryProfileView, TimelineDriver } from '../profile/types';
import type { Fact } from './driver_facts';
import { driverFacts, timingFacts } from './driver_facts';
import { formatDurationMillis } from '../shared/profile_format';
import { groupLabel, planningLabel, spreadLabel } from './timeline_labels';
import { TimelineDetails } from './timeline_details';
import type { LaneBox } from './timeline_layout';
import { spanMillis } from '../shared/time_span';
import { driverSpread, fullDomain, groupDrivers, laneBox } from './timeline_layout';
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

const LaneTooltip = ({ name, facts }: { name: string; facts: Fact[] }) => (
  <>
    <strong>{name}</strong>
    {facts.map(({ id, label, value }) => (
      <div key={id}>
        {label} {value}
      </div>
    ))}
  </>
);

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
  const spread = useMemo(() => driverSpread(drivers), [drivers]);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p data-test-subj="esqlQueryProfileGroupHeader">
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
      <EuiSpacer size="xs" />
    </>
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
              <LaneTooltip name={planningLabel()} facts={timingFacts(timeline.planning, origin)} />
            }
            box={laneBox(timeline.planning.startMillis, timeline.planning.stopMillis, domain)}
            colorCss={styles.planningColor}
            isSelected={selectedLaneId === PLANNING_LANE_ID}
            onClick={() => toggle(PLANNING_LANE_ID)}
            testSubject="esqlQueryProfilePlanningLane"
          />
        ) : null}
        {groups.map(([description, drivers], groupIndex) => (
          <div key={description || 'other'}>
            <GroupHeader description={description} drivers={drivers} />
            {drivers.map((driver) => (
              <Lane
                key={driver.id}
                label={driver.nodeName || driver.label}
                durationMillis={spanMillis(driver)}
                tooltip={<LaneTooltip name={driver.label} facts={driverFacts(driver, origin)} />}
                box={laneBox(driver.startMillis, driver.stopMillis, domain)}
                waits={driver.sleeps.map((sleep) =>
                  laneBox(sleep.startMillis, sleep.stopMillis, domain)
                )}
                colorCss={styles.groupColor(groupIndex)}
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
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span css={styles.waitSwatch} aria-hidden="true" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('data.inspector.queryProfile.waitingLegendLabel', {
                      defaultMessage: 'Waiting, for example for another driver to send data',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
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
