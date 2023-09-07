/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';
import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for a {@link SelectInput} component.
 */
export interface SelectInputProps extends InputProps<'select'> {
  /** Specify the option labels to their values. */
  optionLabels: Record<string, string | number>;
  /** Specify the option values. */
  optionValues: Array<string | number>;
}

/**
 * Component for manipulating a `select` field.
 */
export const SelectInput = ({
  ariaDescribedBy,
  ariaLabel,
  id,
  isDisabled = false,
  onChange: onChangeProp,
  optionLabels = {},
  optionValues: optionsProp,
  value: valueProp,
}: SelectInputProps) => {
  if (optionsProp.length === 0) {
    throw new Error('non-empty `optionValues` are required for `SelectInput`.');
  }

  const options = useMemo(
    () =>
      optionsProp?.map((option) => ({
        text: optionLabels.hasOwnProperty(option) ? optionLabels[option] : option,
        value: option,
      })),
    [optionsProp, optionLabels]
  );

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeProp({ value: event.target.value });
  };

  // nit: we have to do this because, while the `UiSettingsService` might return
  // `null`, the {@link EuiSelect} component doesn't accept `null` as a value.
  //
  // @see packages/core/ui-settings/core-ui-settings-common/src/ui_settings.ts
  //
  const value = valueProp === null ? undefined : valueProp;

  return (
    <EuiSelect
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={isDisabled}
      fullWidth
      {...{ onChange, options, value }}
    />
  );
};
