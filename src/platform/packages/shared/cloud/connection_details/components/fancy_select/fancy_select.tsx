/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiSuperSelect, EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { FancySelectOption } from './types';

export interface FancySelectProps {
  value: string;
  options: FancySelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

export const FancySelect: React.FC<FancySelectProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
}) => {
  return (
    <EuiSuperSelect
      aria-label={ariaLabel}
      valueOfSelected={value}
      options={options.map((option) => ({
        value: option.id,
        icon: option.icon,
        layoutAlign: 'center',
        inputDisplay: (
          <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'} gutterSize={'s'}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={option.icon} />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiText size={'s'} textAlign={'left'}>
                {option.title}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        dropdownDisplay: (
          <EuiText size="s">
            <strong>{option.title}</strong>
            <EuiText size="s" color="subdued">
              <p>{option.description}</p>
            </EuiText>
          </EuiText>
        ),
      }))}
      onChange={onChange}
    />
  );
};
