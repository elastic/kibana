/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';
import { SwitchModePopover } from './switch_mode_popover';

import type { SelectIndexComponentProps } from './types';

export const FieldTextSelect = ({
  fetchedIndex,
  onIndexChange,
  disabled,
  placeholder,
  onModeChange,
  allowSwitchMode,
  'data-test-subj': dataTestSubj,
}: SelectIndexComponentProps) => {
  const [inputValue, setInputValue] = useState<string>();
  const { indexPatternString } = fetchedIndex;

  const onFieldTextChange: EuiFieldTextProps['onChange'] = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  useEffect(() => {
    if (inputValue === undefined) {
      setInputValue(indexPatternString ?? '');
    }
  }, [indexPatternString, inputValue]);

  useDebounce(
    () => {
      if ((inputValue ?? '') !== (indexPatternString ?? '')) {
        onIndexChange(inputValue);
      }
    },
    150,
    [inputValue, onIndexChange]
  );

  return (
    <EuiFieldText
      disabled={disabled}
      onChange={onFieldTextChange}
      value={inputValue ?? ''}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      {...(allowSwitchMode && {
        append: (
          <SwitchModePopover
            onModeChange={onModeChange}
            fetchedIndex={fetchedIndex}
            useKibanaIndices={false}
          />
        ),
      })}
    />
  );
};
