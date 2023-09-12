/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFieldNumber } from '@elastic/eui';
import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for a {@link NumberInput} component.
 */
export type NumberInputProps = InputProps<'number'>;

/**
 * Component for manipulating a `number` field.
 */
export const NumberInput = ({
  ariaDescribedBy,
  ariaLabel,
  id,
  isDisabled: disabled = false,
  name,
  onChange: onChangeProp,
  value: valueProp,
}: NumberInputProps) => {
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChangeProp({ value: Number(event.target.value) });

  // nit: we have to do this because, while the `UiSettingsService` might return
  // `null`, the {@link EuiFieldNumber} component doesn't accept `null` as a
  // value.
  //
  // @see packages/core/ui-settings/core-ui-settings-common/src/ui_settings.ts
  //
  const value = valueProp === null ? undefined : valueProp;

  return (
    <EuiFieldNumber
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      fullWidth
      {...{ disabled, name, value, onChange }}
    />
  );
};
