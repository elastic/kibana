/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFieldText, EuiFieldTextProps } from '@elastic/eui';

import { getFieldInputValue } from '@kbn/management-settings-utilities';
import { useUpdate } from '@kbn/management-settings-utilities';

import { debounce } from 'lodash';
import { OnInputChangeFn } from '@kbn/management-settings-types';
import { useServices } from '../services';
import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

/**
 * Props for an {@link ArrayFieldInput} component.
 */
export type ArrayInputProps = InputProps<'array'>;

const REGEX = /,\s+/g;

/**
 * Component for manipulating an `array` field.
 */
export const ArrayInput = ({
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: ArrayInputProps) => {
  const [inputValue] = getFieldInputValue(field, unsavedChange) || [];
  const [value, setValue] = useState(inputValue?.join(', '));
  const { validateChange } = useServices();
  const onUpdate = useUpdate({ onInputChange, field });

  const updateValue = useCallback(
    async (newValue: string, onUpdateFn: OnInputChangeFn<'array'>) => {
      const parsedValue = newValue
        .replace(REGEX, ',')
        .split(',')
        .filter((v) => v !== '');
      const validationResponse = await validateChange(field.id, parsedValue);
      if (validationResponse.successfulValidation && !validationResponse.valid) {
        onUpdateFn({
          type: field.type,
          unsavedValue: parsedValue,
          isInvalid: !validationResponse.valid,
          error: validationResponse.errorMessage,
        });
      } else {
        onUpdateFn({ type: field.type, unsavedValue: parsedValue });
      }
    },
    [validateChange, field.id, field.type]
  );

  const debouncedUpdateValue = useMemo(() => {
    // Trigger update 1000 ms after the user stopped typing to reduce validation requests to the server
    return debounce(updateValue, 1000);
  }, [updateValue]);

  const onChange: EuiFieldTextProps['onChange'] = async (event) => {
    const newValue = event.target.value;
    setValue(newValue);
    await debouncedUpdateValue(newValue, onUpdate);
  };

  useEffect(() => {
    setValue(inputValue?.join(', '));
  }, [inputValue]);

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;

  return (
    <EuiFieldText
      fullWidth
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      disabled={!isSavingEnabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...{ name, onChange, value }}
    />
  );
};
