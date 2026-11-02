/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { debounce } from 'lodash';
import type { OnInputChangeFn } from '@kbn/management-settings-types';
import type { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { useServices } from '../services';

/**
 * Props for a {@link TextInput} component.
 */
export type TextInputProps = InputProps<'string'>;

/**
 * Component for manipulating a `string` field.
 */
export const TextInput = ({
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: TextInputProps) => {
  const [inputValue] = getFieldInputValue(field, unsavedChange);
  const [value, setValue] = useState(inputValue);
  const { validateChange } = useServices();
  const onUpdate = useUpdate({ onInputChange, field });
  const latestValue = useRef(inputValue);

  const validateValue = useCallback(
    async (newValue: string, onUpdateFn: OnInputChangeFn<'string'>) => {
      const validationResponse = await validateChange(field.id, newValue);
      // Ignore the response if the value has changed since this validation was requested.
      if (latestValue.current !== newValue) {
        return;
      }

      if (validationResponse.successfulValidation && !validationResponse.valid) {
        onUpdateFn({
          type: field.type,
          unsavedValue: newValue,
          isInvalid: true,
          error: validationResponse.errorMessage,
        });
      }
    },
    [validateChange, field.id, field.type]
  );

  const debouncedValidate = useMemo(() => {
    // Trigger validation 500 ms after the user stopped typing to reduce validation requests to the server
    return debounce(validateValue, 500);
  }, [validateValue]);

  const onChange: EuiFieldTextProps['onChange'] = (event) => {
    const newValue = event.target.value;
    latestValue.current = newValue;
    setValue(newValue);
    onUpdate({ type: field.type, unsavedValue: newValue });
    debouncedValidate(newValue, onUpdate);
  };

  useEffect(() => {
    setValue(inputValue);
    latestValue.current = inputValue;
  }, [inputValue]);

  useEffect(() => () => debouncedValidate.cancel(), [debouncedValidate]);

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
