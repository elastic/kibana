/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { getIconTypes } from '../library/eui_icon_cache';

interface Props {
  value: string;
  onChange: (iconType: string) => void;
  onFocus?: () => void;
  'aria-label'?: string;
}

export const IconPicker = ({ value, onChange, onFocus, 'aria-label': ariaLabel }: Props) => {
  const [iconTypes, setIconTypes] = useState<string[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getIconTypes().then(setIconTypes);
  }, []);

  const allOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      iconTypes.map((type) => ({
        label: type,
        value: type,
      })),
    [iconTypes]
  );

  const selectedOptions = useMemo(() => {
    if (!value) return [];
    return [
      {
        label: value,
        value,
        prepend: <EuiIcon type={value} size="s" aria-hidden />,
      },
    ];
  }, [value]);

  const handleChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      const selected = options[0];
      if (selected?.value) {
        onChange(selected.value);
      }
    },
    [onChange]
  );

  return (
    <EuiComboBox
      css={{ width: 344 }}
      aria-label={ariaLabel ?? 'Select an icon'}
      singleSelection={{ asPlainText: true }}
      options={allOptions}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      onFocus={onFocus}
      compressed
      isClearable={false}
      renderOption={(option) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={option.value ?? option.label} aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>{option.label}</EuiFlexItem>
        </EuiFlexGroup>
      )}
    />
  );
};
