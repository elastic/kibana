/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorScheduling } from '../../types/connectors';
import { Frequency } from '../../types/cron_editor';
import { CronEditor } from '../cron_editor';

interface ConnectorCronEditorProps {
  dataTelemetryIdPrefix: string;
  disabled?: boolean;
  frequencyBlockList?: string[];
  hasSyncTypeChanges: boolean;
  onReset?(): void;
  onSave?(interval: ConnectorScheduling['interval']): void;
  scheduling: ConnectorScheduling;
  setHasSyncTypeChanges: (state: boolean) => void;
  status: boolean;
}
export const ConnectorCronEditor: React.FC<ConnectorCronEditorProps> = ({
  dataTelemetryIdPrefix,
  disabled = false,
  frequencyBlockList = [],
  hasSyncTypeChanges,
  onReset,
  onSave,
  scheduling,
  setHasSyncTypeChanges,
  status,
}) => {
  const [newInterval, setNewInterval] = useState(scheduling.interval);
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState({});
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: Frequency;
  }>({
    expression: scheduling.interval ?? '',
    frequency: scheduling.interval ? cronToFrequency(scheduling.interval) : 'HOUR',
  });
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <CronEditor
          data-telemetry-id={`${dataTelemetryIdPrefix}-connector-scheduling-editSchedule`}
          disabled={!scheduling.enabled || disabled}
          fieldToPreferredValueMap={fieldToPreferredValueMap}
          cronExpression={simpleCron.expression}
          frequency={simpleCron.frequency}
          onChange={({
            cronExpression: expression,
            frequency,
            fieldToPreferredValueMap: newFieldToPreferredValueMap,
          }) => {
            setSimpleCron({
              expression,
              frequency,
            });
            setFieldToPreferredValueMap(newFieldToPreferredValueMap);
            setNewInterval(expression);
            setHasSyncTypeChanges(true);
          }}
          frequencyBlockList={frequencyBlockList}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id={`${dataTelemetryIdPrefix}-connector-scheduling-resetSchedule`}
              disabled={!hasSyncTypeChanges || status || disabled}
              onClick={() => {
                setNewInterval(scheduling.interval);
                setSimpleCron({
                  expression: scheduling.interval ?? '',
                  frequency: scheduling.interval ? cronToFrequency(scheduling.interval) : 'HOUR',
                });
                setHasSyncTypeChanges(false);
                if (onReset) {
                  onReset();
                }
              }}
            >
              {i18n.translate('searchConnectors.connectorScheduling.resetButton.label', {
                defaultMessage: 'Reset',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id={`${dataTelemetryIdPrefix}-connector-scheduling-saveSchedule`}
              disabled={!hasSyncTypeChanges || status || disabled}
              onClick={() => onSave && onSave(newInterval)}
            >
              {i18n.translate('searchConnectors.connectorScheduling.saveButton.label', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
function cronToFrequency(cron: string): Frequency {
  const fields = cron.split(' ');
  if (fields.length < 4) {
    return 'YEAR';
  }
  if (fields[1] === '*' || fields[1].includes(',')) {
    return 'MINUTE';
  }
  if (fields[2] === '*') {
    return 'HOUR';
  }
  if (fields[3] === '*') {
    return 'DAY';
  }
  if (fields[3] === '?') {
    return 'WEEK';
  }
  if (fields[4] === '*') {
    return 'MONTH';
  }
  return 'YEAR';
}
