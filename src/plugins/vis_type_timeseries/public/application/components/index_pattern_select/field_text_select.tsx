/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';
import { LegacyModePopover } from './legacy_mode_popover';
import { SwitchModePopover } from './switch_mode_popover';

import type { SelectIndexComponentProps } from './types';
import type { IndexPatternObject } from '../../../../common/types';

const toTextValue = (v: IndexPatternObject) => (typeof v === 'string' ? v : v?.title ?? '');

export const FieldTextSelect = ({
  onIndexChange,
  disabled,
  value,
  placeholder,
  onModeChange,
  allowSwitchUseKibanaIndexesMode,
}: SelectIndexComponentProps) => {
  const textualValue = toTextValue(value);
  const append = [<LegacyModePopover index={textualValue} />];

  const onFieldTextChange: EuiFieldTextProps['onChange'] = useCallback(
    (e) => {
      onIndexChange(e.target.value);
    },
    [onIndexChange]
  );

  if (allowSwitchUseKibanaIndexesMode) {
    append.push(<SwitchModePopover isKibanaIndicesModeOn={false} onModeChange={onModeChange} />);
  }

  return (
    <EuiFieldText
      disabled={disabled}
      onChange={onFieldTextChange}
      value={textualValue}
      placeholder={placeholder}
      append={append}
    />
  );
};
