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

import { CodeEditor } from '../code_editor';
import type { InputProps, OnChangeFn } from '../types';
import { TEST_SUBJ_PREFIX_FIELD } from '.';

type Type = Extract<SettingType, 'json' | 'markdown'>;

/**
 * Props for a {@link CodeEditorInput} component.
 */
export interface CodeEditorInputProps extends InputProps<Type> {
  /** The default value of the {@link CodeEditor} component. */
  defaultValue?: string;
  /**
   * The `onChange` event handler, expanded to include both `markdown`
   * and `json`
   */
  onChange: OnChangeFn<Type>;
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
  ariaDescribedBy,
  ariaLabel,
  defaultValue,
  id,
  isDisabled = false,
  onChange: onChangeProp,
  type,
  value: valueProp = '',
}: CodeEditorInputProps) => {
  const onChange = (newValue: string) => {
    let newUnsavedValue;
    let errorParams = {};

    switch (type) {
      case 'json':
        const isJsonArray = Array.isArray(JSON.parse(defaultValue || '{}'));
        newUnsavedValue = newValue || (isJsonArray ? '[]' : '{}');

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
        newUnsavedValue = newValue;
    }

    // TODO: clintandrewhall - should we make this onBlur instead of onChange?
    onChangeProp({
      value: newUnsavedValue,
      ...errorParams,
    });
  };

  // nit: we have to do this because, while the `UiSettingsService` might return
  // `null`, the {@link CodeEditor} component doesn't accept `null` as a value.
  //
  // @see packages/core/ui-settings/core-ui-settings-common/src/ui_settings.ts
  //
  const value = valueProp === null ? '' : valueProp;

  return (
    <div>
      <CodeEditor
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        data-test-subj={`${TEST_SUBJ_PREFIX_FIELD}-${id}`}
        isReadOnly={isDisabled}
        name={`${TEST_SUBJ_PREFIX_FIELD}-${id}-editor`}
        {...{ onChange, type, value }}
      />
    </div>
  );
};
