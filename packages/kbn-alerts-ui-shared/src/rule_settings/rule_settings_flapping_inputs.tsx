/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  MIN_LOOK_BACK_WINDOW,
  MAX_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_STATUS_CHANGE_THRESHOLD,
} from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { RuleSettingsRangeInput } from './rule_settings_range_input';

const lookBackWindowLabel = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingInputsProps.lookBackWindowLabel',
  {
    defaultMessage: 'Rule run look back window',
  }
);

const lookBackWindowHelp = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingInputsProps.lookBackWindowHelp',
  {
    defaultMessage: 'The minimum number of runs in which the threshold must be met.',
  }
);

const statusChangeThresholdLabel = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingInputsProps.statusChangeThresholdLabel',
  {
    defaultMessage: 'Alert status change threshold',
  }
);

const statusChangeThresholdHelp = i18n.translate(
  'alertsUIShared.ruleSettingsFlappingInputsProps.statusChangeThresholdHelp',
  {
    defaultMessage:
      'The minimum number of times an alert must switch states in the look back window.',
  }
);

export interface RuleSettingsFlappingInputsProps {
  lookBackWindow: number;
  statusChangeThreshold: number;
  isDisabled?: boolean;
  onLookBackWindowChange: (value: number) => void;
  onStatusChangeThresholdChange: (value: number) => void;
}

export const RuleSettingsFlappingInputs = (props: RuleSettingsFlappingInputsProps) => {
  const {
    lookBackWindow,
    statusChangeThreshold,
    isDisabled = false,
    onLookBackWindowChange,
    onStatusChangeThresholdChange,
  } = props;

  const internalOnLookBackWindowChange = useCallback<
    NonNullable<React.ComponentProps<typeof RuleSettingsRangeInput>['onChange']>
  >(
    (e) => {
      onLookBackWindowChange(parseInt(e.currentTarget.value, 10));
    },
    [onLookBackWindowChange]
  );

  const internalOnStatusChangeThresholdChange = useCallback<
    NonNullable<React.ComponentProps<typeof RuleSettingsRangeInput>['onChange']>
  >(
    (e) => {
      onStatusChangeThresholdChange(parseInt(e.currentTarget.value, 10));
    },
    [onStatusChangeThresholdChange]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <RuleSettingsRangeInput
          fullWidth
          data-test-subj="lookBackWindowRangeInput"
          min={MIN_LOOK_BACK_WINDOW}
          max={MAX_LOOK_BACK_WINDOW}
          value={lookBackWindow}
          onChange={internalOnLookBackWindowChange}
          label={lookBackWindowLabel}
          labelPopoverText={lookBackWindowHelp}
          disabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <RuleSettingsRangeInput
          fullWidth
          data-test-subj="statusChangeThresholdRangeInput"
          min={MIN_STATUS_CHANGE_THRESHOLD}
          max={MAX_STATUS_CHANGE_THRESHOLD}
          value={statusChangeThreshold}
          onChange={internalOnStatusChangeThresholdChange}
          label={statusChangeThresholdLabel}
          labelPopoverText={statusChangeThresholdHelp}
          disabled={isDisabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
