/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFieldNumber, EuiFieldNumberProps } from '@elastic/eui';

import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { debounce } from 'lodash';
import { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { useServices } from '../services';

/**
 * Props for a {@link NumberInput} component.
 */
export type NumberInputProps = InputProps<'number'>;

/**
 * Component for manipulating a `number` field.
 */
export const NumberInput = ({
  field,
  unsavedChange,
  isSavingEnabled,
  onInputChange,
}: NumberInputProps) => {
  const [inputValue] = getFieldInputValue(field, unsavedChange) || undefined;
  const [value, setValue] = useState(inputValue);
  const { validateChange } = useServices();
  const onUpdate = useUpdate({ onInputChange, field });

  const updateValue = useCallback(
    async (newValue: number, onUpdateFn) => {
      const validationResponse = await validateChange(field.id, newValue);
      if (validationResponse.successfulValidation && !validationResponse.valid) {
        onUpdateFn({
          type: field.type,
          unsavedValue: newValue,
          isInvalid: !validationResponse.valid,
          error: validationResponse.errorMessage,
        });
      } else {
        onUpdateFn({ type: field.type, unsavedValue: newValue });
      }
    },
    [validateChange, field.id, field.type]
  );

  const debouncedUpdateValue = useMemo(() => {
    // Trigger update 500 ms after the user stopped typing to reduce validation requests to the server
    return debounce(updateValue, 500);
  }, [updateValue]);

  const onChange: EuiFieldNumberProps['onChange'] = async (event) => {
    const newValue = Number(event.target.value);
    setValue(newValue);
    await debouncedUpdateValue(newValue, onUpdate);
  };

  useEffect(() => {
    setValue(inputValue);
  }, [inputValue]);

  const { id, name, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;

  return (
    <EuiFieldNumber
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
      fullWidth
      disabled={!isSavingEnabled}
      {...{ name, value, onChange }}
    />
  );
};
