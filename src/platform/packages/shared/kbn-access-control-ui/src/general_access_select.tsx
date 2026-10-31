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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiText,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GeneralAccessLevel } from '@kbn/access-control';
import { getGeneralAccessCopy, type AccessCopy } from './copy';

const LEVEL_ICONS: Record<GeneralAccessLevel, string> = {
  none: 'lock',
  view: 'eye',
  use: 'users',
  edit: 'globe',
};

export interface GeneralAccessSelectProps {
  allowed: GeneralAccessLevel[];
  value: GeneralAccessLevel;
  onChange: (value: GeneralAccessLevel) => void;
  copy: AccessCopy;
  isDisabled?: boolean;
}

export const GeneralAccessSelect = ({
  allowed,
  value,
  onChange,
  copy,
  isDisabled,
}: GeneralAccessSelectProps) => {
  const options: Array<EuiSuperSelectOption<GeneralAccessLevel>> = allowed.map((level) => {
    const { label, description } = getGeneralAccessCopy(copy, level);
    return {
      value: level,
      'data-test-subj': `accessPanelGeneralAccessOption-${level}`,
      inputDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={LEVEL_ICONS[level]} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>{label}</EuiFlexItem>
        </EuiFlexGroup>
      ),
      dropdownDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={LEVEL_ICONS[level]} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <strong>{label}</strong>
            <EuiText size="xs" color="subdued">
              {description}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  });

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('accessControlUi.generalAccess.label', {
        defaultMessage: 'General access',
      })}
      helpText={getGeneralAccessCopy(copy, value).description}
    >
      <EuiSuperSelect
        fullWidth
        options={options}
        valueOfSelected={value}
        onChange={onChange}
        disabled={isDisabled}
        data-test-subj="accessPanelGeneralAccess"
      />
    </EuiFormRow>
  );
};
