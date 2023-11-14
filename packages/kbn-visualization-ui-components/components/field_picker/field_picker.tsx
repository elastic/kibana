/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './field_picker.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';
import { FieldIcon } from '@kbn/field-utils/src/components/field_icon';
import classNames from 'classnames';
import type { FieldOptionValue, FieldOption } from './types';

export interface FieldPickerProps<T extends FieldOptionValue>
  extends EuiComboBoxProps<FieldOption<T>['value']> {
  options: Array<FieldOption<T>>;
  selectedField?: string;
  onChoose: (choice: T | undefined) => void;
  onDelete?: () => void;
  fieldIsInvalid: boolean;
  'data-test-subj'?: string;
}

export function FieldPicker<T extends FieldOptionValue = FieldOptionValue>({
  selectedOptions,
  options,
  onChoose,
  onDelete,
  fieldIsInvalid,
  ['data-test-subj']: dataTestSub,
  ...rest
}: FieldPickerProps<T>) {
  const styledOptions = options?.map(({ compatible, exists, ...otherAttr }) => {
    if (otherAttr.options) {
      return {
        ...otherAttr,
        options: otherAttr.options.map(({ exists: fieldOptionExists, ...fieldOption }) => ({
          ...fieldOption,
          prepend: fieldOption.value.dataType ? (
            <FieldIcon type={fieldOption.value.dataType} fill="none" className="eui-alignMiddle" />
          ) : null,
          className: classNames({
            'lnFieldPicker__option--incompatible': !fieldOption.compatible,
            'lnFieldPicker__option--nonExistant': !fieldOptionExists,
          }),
        })),
      };
    }
    return {
      ...otherAttr,
      compatible,
      prepend: otherAttr.value.dataType ? (
        <FieldIcon type={otherAttr.value.dataType} fill="none" className="eui-alignMiddle" />
      ) : null,
      className: classNames({
        'lnFieldPicker__option--incompatible': !compatible,
        'lnFieldPicker__option--nonExistant': !exists,
      }),
    };
  });

  return (
    <div>
      <EuiComboBox
        fullWidth
        compressed
        isClearable={false}
        data-test-subj={dataTestSub ?? 'indexPattern-dimension-field'}
        placeholder={i18n.translate('visualizationUiComponents.fieldPicker.fieldPlaceholder', {
          defaultMessage: 'Select a field',
        })}
        options={styledOptions}
        isInvalid={fieldIsInvalid}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        truncationProps={{ truncation: 'middle' }}
        onChange={(choices) => {
          if (choices.length === 0) {
            onDelete?.();
            return;
          }
          onChoose(choices[0].value);
        }}
        {...rest}
      />
    </div>
  );
}
