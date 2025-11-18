/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import {
  MIN_ALERT_DELETE_THRESHOLD_DAYS,
  MAX_ALERT_DELETE_THRESHOLD_DAYS,
  THRESHOLD_UNITS_SINGULAR,
  THRESHOLD_UNITS,
} from '../constants';

interface ModalThresholdSelectorProps {
  title: string;
  description: string;
  threshold: number;
  thresholdUnit: EuiSelectOption;
  onChangeThreshold: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeThresholdUnit: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isDisabled: boolean;
  isInvalid: boolean;
  isChecked: boolean;
  error: string[];
  thresholdTestSubj: string;
  thresholdUnitTestSubj: string;
}
export const ModalThresholdSelector = ({
  title,
  description,
  threshold,
  thresholdUnit,
  onChangeThreshold,
  onChangeThresholdUnit,
  isDisabled,
  isInvalid,
  isChecked,
  error,
  thresholdTestSubj,
  thresholdUnitTestSubj,
}: ModalThresholdSelectorProps) => {
  const options = threshold === 1 ? THRESHOLD_UNITS_SINGULAR : THRESHOLD_UNITS;

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{title}</h3>}
      description={description}
      descriptionFlexItemProps={{ grow: 2 }}
    >
      <EuiFormRow
        fullWidth
        isInvalid={isInvalid}
        isDisabled={isDisabled}
        error={isChecked ? error : []}
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={1}>
            <EuiFieldNumber
              key={error.join('')} // Force re-render when error changes because the error might happen when changing the threshold
              min={MIN_ALERT_DELETE_THRESHOLD_DAYS}
              max={MAX_ALERT_DELETE_THRESHOLD_DAYS}
              value={threshold}
              onChange={onChangeThreshold}
              disabled={isDisabled}
              isInvalid={isChecked && error.length > 0}
              data-test-subj={thresholdTestSubj}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiSelect
              value={thresholdUnit.text as string}
              onChange={onChangeThresholdUnit}
              options={options}
              disabled={isDisabled}
              data-test-subj={thresholdUnitTestSubj}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
