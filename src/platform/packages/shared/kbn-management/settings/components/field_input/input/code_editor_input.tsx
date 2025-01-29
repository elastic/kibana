/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { SettingType } from '@kbn/management-settings-types';
import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

import { debounce } from 'lodash';
import { useServices } from '../services';
import { CodeEditor, CodeEditorProps } from '../code_editor';
import type { InputProps } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

type Type = Extract<SettingType, 'json' | 'markdown'>;

/**
 * Props for a {@link CodeEditorInput} component.
 */
export interface CodeEditorInputProps extends InputProps<Type> {
  /** The default value of the {@link CodeEditor} component. */
  defaultValue?: string;
  /**
   * The {@link UiSettingType}, expanded to include both `markdown`
   * and `json`
   */
  type: Type;
}

/**
 * Component for manipulating a `json` or `markdown` field.
 *
 * TODO: clintandrewhall - `kibana_react` `CodeEditor` does not support `disabled`.
 */
export const CodeEditorInput = ({
  field,
  unsavedChange,
  type,
  isSavingEnabled,
  defaultValue,
  onInputChange,
}: CodeEditorInputProps) => {
  // @ts-expect-error
  const [inputValue] = getFieldInputValue(field, unsavedChange);
  const [value, setValue] = useState(inputValue);
  const { validateChange } = useServices();
  const onUpdate = useUpdate({ onInputChange, field });

  const updateValue = useCallback(
    async (newValue: string, onUpdateFn: typeof onUpdate) => {
      let parsedValue;

      // Validate JSON syntax
      if (field.type === 'json') {
        try {
          const isJsonArray = Array.isArray(JSON.parse(defaultValue || 'null'));
          parsedValue = newValue || (isJsonArray ? '[]' : '{}');
          JSON.parse(parsedValue);
        } catch (e) {
          onUpdateFn({
            type: field.type,
            unsavedValue: newValue,
            isInvalid: true,
            error: i18n.translate('management.settings.field.codeEditorSyntaxErrorMessage', {
              defaultMessage: 'Invalid JSON syntax',
            }),
          });
          return;
        }
      }

      const validationResponse = await validateChange(field.id, parsedValue);
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
    [validateChange, field.id, field.type, defaultValue]
  );

  const debouncedUpdateValue = useMemo(() => {
    // Trigger update 500 ms after the user stopped typing to reduce validation requests to the server
    return debounce(updateValue, 500);
  }, [updateValue]);

  const onChange: CodeEditorProps['onChange'] = async (newValue) => {
    // Only update the value when the onChange handler is called with a different value from the current one
    if (newValue !== value) {
      // @ts-expect-error
      setValue(newValue);
      await debouncedUpdateValue(newValue, onUpdate);
    }
  };

  useEffect(() => {
    setValue(inputValue);
  }, [inputValue]);

  const { id, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;

  return (
    <div>
      <CodeEditor
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
        isReadOnly={!isSavingEnabled}
        name={`${TEST_SUBJ_PREFIX_FIELD}-${id}-editor`}
        {...{ onChange, type, value }}
      />
    </div>
  );
};
