/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { THRESHOLD_UNITS } from '../constants';

interface ModalThresholdSelectorProps {
  title: string;
  description: string;
  threshold: number;
  thresholdUnit: EuiSelectOption;
  onChangeThreshold: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeThresholdUnit: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isDisabled: boolean;
  isInvalid: boolean;
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
  error,
  thresholdTestSubj,
  thresholdUnitTestSubj,
}: ModalThresholdSelectorProps) => {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{title}</h3>}
      description={description}
      descriptionFlexItemProps={{ grow: 2 }}
    >
      <EuiFormRow fullWidth isInvalid={isInvalid} isDisabled={isDisabled} error={error}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={1}>
            <EuiFieldNumber
              min={1}
              max={1000}
              value={threshold}
              onChange={onChangeThreshold}
              disabled={isDisabled}
              isInvalid={error.length > 0}
              data-test-subj={thresholdTestSubj}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiSelect
              value={thresholdUnit.text as string}
              onChange={onChangeThresholdUnit}
              options={THRESHOLD_UNITS}
              disabled={isDisabled}
              data-test-subj={thresholdUnitTestSubj}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
