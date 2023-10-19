/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { SettingType } from '@kbn/management-settings-types';
import { getFieldInputValue, useUpdate } from '@kbn/management-settings-utilities';

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
  const onUpdate = useUpdate({ onInputChange, field });

  const onChange: CodeEditorProps['onChange'] = (inputValue) => {
    let newUnsavedValue;
    let errorParams = {};

    switch (type) {
      case 'json':
        const isJsonArray = Array.isArray(JSON.parse(defaultValue || '{}'));
        newUnsavedValue = inputValue || (isJsonArray ? '[]' : '{}');

        try {
          JSON.parse(newUnsavedValue);
        } catch (e) {
          errorParams = {
            error: i18n.translate('management.settings.field.codeEditorSyntaxErrorMessage', {
              defaultMessage: 'Invalid JSON syntax',
            }),
            isInvalid: true,
          };
        }
        break;
      default:
        newUnsavedValue = inputValue;
    }

    onUpdate({ type: field.type, unsavedValue: inputValue, ...errorParams });
  };

  const { id, ariaAttributes } = field;
  const { ariaLabel, ariaDescribedBy } = ariaAttributes;
  // @ts-expect-error
  const [value] = getFieldInputValue(field, unsavedChange);

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
