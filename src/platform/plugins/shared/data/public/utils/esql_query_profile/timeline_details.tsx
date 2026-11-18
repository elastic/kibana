/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView, TimelineDriver, TimelineOperator } from './types';
import { operatorCategory, useOperatorCategoryColors } from './operator_category';
import { formatCount, formatDurationMillis } from './profile_format';
import { heatLevel } from './profile_heat';
import { operatorShareLabel, operatorTimeLabel, planningPhaseLabel } from './timeline_labels';
import { spanMillis } from './timeline_layout';
import { useTimelineStyles } from './timeline_styles';

/** An operator also has to be at least this share of the whole query to be flagged. */
const MIN_QUERY_SHARE = 0.05;

/** An operator is hot when it is a large part of its driver and a real part of the whole query. */
const isHotOperator = (operator: TimelineOperator, totalOperatorNanos: number): boolean =>
  heatLevel(operator.share) !== 'cool' &&
  totalOperatorNanos > 0 &&
  operator.processNanos / totalOperatorNanos >= MIN_QUERY_SHARE;

/** Identifies an operator inside its driver. The same operator can repeat, so the position counts. */
const operatorKey = (operator: TimelineOperator, index: number): string =>
  `${index}:${operator.operator}`;

const Stat = ({ label, value }: { label: string; value: string }) => (
  <EuiFlexItem grow={false}>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiText size="s">
      <strong>{value}</strong>
    </EuiText>
  </EuiFlexItem>
);

const Stats = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexGroup gutterSize="l" responsive={false} wrap>
    {children}
  </EuiFlexGroup>
);

const OperatorTooltip = ({
  operator,
  time,
  share,
}: {
  operator: TimelineOperator;
  time: string;
  share: string;
}) => (
  <>
    <strong>{operator.title}</strong>
    <div>
      {operator.timeReported
        ? i18n.translate('data.inspector.queryProfile.stripTooltipTiming', {
            defaultMessage: '{time}, {share} of this driver',
            values: { time, share },
          })
        : i18n.translate('data.inspector.queryProfile.stripTooltipNoTime', {
            defaultMessage: 'This operator does not report time',
          })}
    </div>
  </>
);

const OperatorDetails = ({
  driver,
  operator,
}: {
  driver: TimelineDriver;
  operator: TimelineOperator;
}) => {
  const rawStatus = useMemo(() => JSON.stringify(operator.rawStatus, null, 2), [operator]);

  return (
    <div data-test-subj="esqlQueryProfileOperatorDetails">
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>{operator.title}</strong>
      </EuiText>
      {operator.detail ? (
        <EuiText size="xs" color="subdued">
          <p>{operator.detail}</p>
        </EuiText>
      ) : null}
      <EuiSpacer size="s" />
      <Stats>
        <Stat
          label={i18n.translate('data.inspector.queryProfile.operatorTimeStatLabel', {
            defaultMessage: 'Time',
          })}
          value={operatorTimeLabel(operator)}
        />
        <Stat
          label={i18n.translate('data.inspector.queryProfile.operatorShareLabel', {
            defaultMessage: 'Share of driver',
          })}
          value={operatorShareLabel(operator)}
        />
        <Stat
          label={i18n.translate('data.inspector.queryProfile.operatorRowsInLabel', {
            defaultMessage: 'Rows in',
          })}
          value={formatCount(operator.rowsReceived)}
        />
        <Stat
          label={i18n.translate('data.inspector.queryProfile.operatorRowsOutLabel', {
            defaultMessage: 'Rows out',
          })}
          value={formatCount(operator.rowsEmitted)}
        />
      </Stats>
      <EuiSpacer size="s" />
      <EuiAccordion
        id={`esqlQueryProfileRawStatus-${driver.id}`}
        buttonContent={i18n.translate('data.inspector.queryProfile.rawStatusLabel', {
          defaultMessage: 'Raw status',
        })}
        paddingSize="s"
        data-test-subj="esqlQueryProfileRawStatus"
      >
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
          {rawStatus}
        </EuiCodeBlock>
      </EuiAccordion>
    </div>
  );
};

const OperatorStrip = ({
  driver,
  totalOperatorNanos,
  selectedKey,
  onSelect,
}: {
  driver: TimelineDriver;
  totalOperatorNanos: number;
  selectedKey?: string;
  onSelect: (key: string | undefined) => void;
}) => {
  const styles = useTimelineStyles();
  const categoryColor = useOperatorCategoryColors();

  return (
    <div css={styles.strip} data-test-subj="esqlQueryProfileOperatorStrip">
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
            content={<OperatorTooltip operator={operator} time={time} share={share} />}
          >
            <button
              type="button"
              css={styles.stripStep}
              aria-expanded={selectedKey === key}
              aria-label={i18n.translate('data.inspector.queryProfile.operatorButtonAriaLabel', {
                defaultMessage: '{title}, {time}, {share}',
                values: { title: operator.title, time, share },
              })}
              onClick={() => onSelect(selectedKey === key ? undefined : key)}
              data-test-subj="esqlQueryProfileOperator"
            >
              <span css={styles.stripTitle}>{operator.title}</span>
              <span css={styles.stripShare}>
                {share}
                {isHotOperator(operator, totalOperatorNanos) ? (
                  <EuiIcon
                    type="thermometer"
                    size="s"
                    color={heatLevel(operator.share) === 'hot' ? 'danger' : 'warning'}
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
  );
};

const DriverDetails = ({
  driver,
  origin,
  totalOperatorNanos,
  selectedKey,
  onSelectOperator,
}: {
  driver: TimelineDriver;
  /** Where the timeline starts, so the driver's start can be told relative to it. */
  origin: number;
  totalOperatorNanos: number;
  selectedKey?: string;
  onSelectOperator: (key: string | undefined) => void;
}) => {
  const selected = driver.operators.find(
    (operator, index) => operatorKey(operator, index) === selectedKey
  );
  const hasUnrecordedWaits = driver.sleepCount > driver.sleeps.length;

  return (
    <div data-test-subj="esqlQueryProfileDriverOperators">
      <EuiText size="s">
        <strong>{driver.label}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <Stats>
        <Stat
          label={i18n.translate('data.inspector.queryProfile.driverStartLabel', {
            defaultMessage: 'Starts at',
          })}
          value={`+${formatDurationMillis(Math.max(driver.startMillis - origin, 0))}`}
        />
        <Stat
          label={i18n.translate('data.inspector.queryProfile.driverDurationLabel', {
            defaultMessage: 'Duration',
          })}
          value={formatDurationMillis(spanMillis(driver))}
        />
        {driver.cpuNanos !== undefined ? (
          <Stat
            label={i18n.translate('data.inspector.queryProfile.driverCpuLabel', {
              defaultMessage: 'CPU',
            })}
            value={formatDurationMillis(driver.cpuNanos / 1e6)}
          />
        ) : null}
        {driver.sleepCount > 0 ? (
          <Stat
            label={i18n.translate('data.inspector.queryProfile.driverWaitedLabel', {
              defaultMessage: '{isLowerBound, select, true {Waited at least} other {Waited}}',
              values: { isLowerBound: hasUnrecordedWaits },
            })}
            value={formatDurationMillis(driver.waitedMillis)}
          />
        ) : null}
      </Stats>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.driverOperatorTimeDescription"
            defaultMessage="Operator time inside {driver}. These widths are not wall-clock time."
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
        <OperatorStrip
          driver={driver}
          totalOperatorNanos={totalOperatorNanos}
          selectedKey={selectedKey}
          onSelect={onSelectOperator}
        />
      )}
      {selected ? <OperatorDetails driver={driver} operator={selected} /> : null}
    </div>
  );
};

const PlanningDetails = ({ view }: { view: QueryProfileView }) => (
  <div data-test-subj="esqlQueryProfilePlanningPhases">
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

/** What the selected lane is made of, pinned under the lanes. It says what to do when nothing is selected. */
export const TimelineDetails = ({
  view,
  driver,
  isPlanningSelected,
  origin,
  totalOperatorNanos,
  selectedOperatorKey,
  onSelectOperator,
}: {
  view: QueryProfileView;
  driver?: TimelineDriver;
  isPlanningSelected: boolean;
  origin: number;
  totalOperatorNanos: number;
  selectedOperatorKey?: string;
  onSelectOperator: (key: string | undefined) => void;
}) => {
  if (!driver && !isPlanningSelected) {
    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          data-test-subj="esqlQueryProfileDetailsHint"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="clickLeft" aria-hidden="true" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="data.inspector.queryProfile.detailsHintDescription"
                  defaultMessage="Select a lane to see its details and operators."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="esqlQueryProfileDetails">
      {driver ? (
        <DriverDetails
          key={driver.id}
          driver={driver}
          origin={origin}
          totalOperatorNanos={totalOperatorNanos}
          selectedKey={selectedOperatorKey}
          onSelectOperator={onSelectOperator}
        />
      ) : (
        <PlanningDetails view={view} />
      )}
    </EuiPanel>
  );
};
