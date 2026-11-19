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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView, TimelineDriver, TimelineOperator } from '../profile/types';
import { driverFacts } from './driver_facts';
import { operatorCategory, useOperatorCategoryColors } from '../shared/operator_category';
import { formatCount, formatDurationMillis } from '../shared/profile_format';
import { heatLevel } from '../shared/profile_heat';
import { operatorShareLabel, operatorTimeLabel, planningPhaseLabel } from './timeline_labels';
import { useOperatorStripStyles } from './operator_strip_styles';

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
      {operator.detail ? (
        <>
          <EuiText size="xs" color="subdued">
            <p>{operator.detail}</p>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      ) : null}
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
  const styles = useOperatorStripStyles();
  const categoryColor = useOperatorCategoryColors();

  return (
    <div css={styles.strip} data-test-subj="esqlQueryProfileOperatorStrip">
      {driver.operators.map((operator, index) => {
        const key = operatorKey(operator, index);
        const time = operatorTimeLabel(operator);
        const share = operatorShareLabel(operator);
        return (
          <button
            key={key}
            type="button"
            css={styles.stripStep}
            style={{ flexGrow: Math.max(operator.share * 100, 1) }}
            aria-expanded={selectedKey === key}
            aria-label={i18n.translate('data.inspector.queryProfile.operatorButtonAriaLabel', {
              defaultMessage: '{title}, {time}, {share}, {rowsIn} rows in, {rowsOut} rows out',
              values: {
                title: operator.title,
                time,
                share,
                rowsIn: formatCount(operator.rowsReceived),
                rowsOut: formatCount(operator.rowsEmitted),
              },
            })}
            onClick={() => onSelect(selectedKey === key ? undefined : key)}
            data-test-subj="esqlQueryProfileOperator"
          >
            <span css={styles.stripTitle}>{operator.title}</span>
            <span css={styles.stripShare}>
              {operator.timeReported ? `${share} · ${time}` : share}
              {isHotOperator(operator, totalOperatorNanos) ? (
                <EuiIcon
                  type="thermometer"
                  size="s"
                  color={heatLevel(operator.share) === 'hot' ? 'danger' : 'warning'}
                  aria-hidden="true"
                />
              ) : null}
            </span>
            <span css={styles.stripShare}>
              {i18n.translate('data.inspector.queryProfile.operatorRowsLabel', {
                defaultMessage: 'Rows {rowsIn} → {rowsOut}',
                values: {
                  rowsIn: formatCount(operator.rowsReceived),
                  rowsOut: formatCount(operator.rowsEmitted),
                },
              })}
            </span>
            <span
              css={styles.stripBar}
              style={{ background: categoryColor[operatorCategory(operator.title)] }}
            />
          </button>
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

  return (
    <div data-test-subj="esqlQueryProfileDriverOperators">
      <EuiText size="s">
        <strong>{driver.label}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="inline"
        compressed
        listItems={driverFacts(driver, origin).map(({ label, value }) => ({
          title: label,
          description: value,
        }))}
      />
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
    <>
      <EuiSpacer size="m" />
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        data-test-subj="esqlQueryProfileDetails"
      >
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
    </>
  );
};
