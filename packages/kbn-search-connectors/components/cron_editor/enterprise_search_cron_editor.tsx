/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { ConnectorScheduling, Frequency } from '../../types';

import { CronEditor } from './cron_editor';

interface Props {
  disabled?: boolean;
  onChange(scheduling: ConnectorScheduling): void;
  scheduling: ConnectorScheduling;
}

export const EnterpriseSearchCronEditor: React.FC<Props> = ({ disabled, onChange, scheduling }) => {
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState({});
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: Frequency;
  }>({
    expression: scheduling?.interval ?? '',
    frequency: scheduling?.interval ? cronToFrequency(scheduling.interval) : 'HOUR',
  });

  return (
    <CronEditor
      fieldToPreferredValueMap={fieldToPreferredValueMap}
      cronExpression={simpleCron.expression}
      frequency={simpleCron.frequency}
      disabled={disabled}
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
        onChange({ ...scheduling, interval: expression });
      }}
      frequencyBlockList={['MINUTE']}
    />
  );
};

function cronToFrequency(cron: string): Frequency {
  const fields = cron.split(' ');
  if (fields.length < 4) {
    return 'YEAR';
  }
  if (fields[1] === '*') {
    return 'MINUTE';
  }
  if (fields[2] === '*') {
    return 'HOUR';
  }
  if (fields[3] === '*') {
    return 'DAY';
  }
  if (fields[4] === '*') {
    return 'WEEK';
  }
  if (fields[4] === '?') {
    return 'MONTH';
  }
  return 'YEAR';
}
