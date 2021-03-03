/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';
import { SwitchModePopover } from './switch_mode_popover';
import { convertIndexPatternObjectToStringRepresentation } from '../../../../../common/index_patterns_utils';

import type { SelectIndexComponentProps } from './types';

export const FieldTextSelect = ({
  onIndexChange,
  disabled,
  value,
  placeholder,
  onModeChange,
  allowSwitchMode,
  'data-test-subj': dataTestSubj,
}: SelectIndexComponentProps) => {
  const textualValue = convertIndexPatternObjectToStringRepresentation(value);

  const onFieldTextChange: EuiFieldTextProps['onChange'] = useCallback(
    (e) => {
      onIndexChange(e.target.value);
    },
    [onIndexChange]
  );

  return (
    <EuiFieldText
      disabled={disabled}
      onChange={onFieldTextChange}
      value={textualValue}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      {...(allowSwitchMode && {
        append: (
          <SwitchModePopover onModeChange={onModeChange} value={value} useKibanaIndices={false} />
        ),
      })}
    />
  );
};
