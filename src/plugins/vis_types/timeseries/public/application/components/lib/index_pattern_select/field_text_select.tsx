/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFieldTextProps, EuiButtonIcon } from '@elastic/eui';
import { SwitchModePopover } from './switch_mode_popover';
import type { SelectIndexComponentProps } from './types';

const updateIndexText = i18n.translate('visTypeTimeseries.indexPatternSelect.updateIndex', {
  defaultMessage: 'Update visualization with entered data view',
});

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

  const onFieldTextChange = useCallback<NonNullable<EuiFieldTextProps['onChange']>>((e) => {
    setInputValue(e.target.value);
  }, []);

  useEffect(() => {
    if (inputValue === undefined) {
      setInputValue(indexPatternString ?? '');
    }
  }, [indexPatternString, inputValue]);

  const updateIndex = useCallback(() => {
    if ((inputValue ?? '') !== (indexPatternString ?? '')) {
      onIndexChange(inputValue);
    }
  }, [onIndexChange, inputValue, indexPatternString]);

  const appends = [
    <EuiButtonIcon
      aria-label={updateIndexText}
      iconType="play"
      onClick={updateIndex}
      disabled={inputValue === indexPatternString}
    />,
  ];

  if (allowSwitchMode) {
    appends.push(
      <SwitchModePopover
        onModeChange={onModeChange}
        fetchedIndex={fetchedIndex}
        useKibanaIndices={false}
      />
    );
  }

  return (
    <EuiFieldText
      disabled={disabled}
      onChange={onFieldTextChange}
      value={inputValue ?? ''}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      append={appends}
    />
  );
};
