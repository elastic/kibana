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

const MIDDLE_TRUNCATION_PROPS = { truncation: 'middle' as const };
const SINGLE_SELECTION_AS_TEXT_PROPS = { asPlainText: true };

export function FieldPicker<T extends FieldOptionValue = FieldOptionValue>({
  selectedOptions,
  options,
  onChoose,
  onDelete,
  fieldIsInvalid,
  ['data-test-subj']: dataTestSub,
  ...rest
}: FieldPickerProps<T>) {
  let theLongestLabel = '';
  const styledOptions = options?.map(({ compatible, exists, ...otherAttr }) => {
    if (otherAttr.options) {
      return {
        ...otherAttr,
        options: otherAttr.options.map(({ exists: fieldOptionExists, ...fieldOption }) => {
          if (fieldOption.label.length > theLongestLabel.length) {
            theLongestLabel = fieldOption.label;
          }
          return {
            ...fieldOption,
            prepend: fieldOption.value.dataType ? (
              <FieldIcon
                type={fieldOption.value.dataType}
                fill="none"
                className="eui-alignMiddle"
              />
            ) : null,
            className: classNames({
              'lnFieldPicker__option--incompatible': !fieldOption.compatible,
              'lnFieldPicker__option--nonExistant': !fieldOptionExists,
            }),
          };
        }),
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

  const panelMinWidth = getPanelMinWidth(theLongestLabel.length);
  return (
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
      singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
      truncationProps={MIDDLE_TRUNCATION_PROPS}
      inputPopoverProps={{ panelMinWidth }}
      onChange={(choices) => {
        if (choices.length === 0) {
          onDelete?.();
          return;
        }
        onChoose(choices[0].value);
      }}
      {...rest}
    />
  );
}

const MINIMUM_POPOVER_WIDTH = 300;
const MINIMUM_POPOVER_WIDTH_CHAR_COUNT = 28;
const AVERAGE_CHAR_WIDTH = 7;
const MAXIMUM_POPOVER_WIDTH_CHAR_COUNT = 60;
const MAXIMUM_POPOVER_WIDTH = 550; // fitting 60 characters

function getPanelMinWidth(labelLength: number) {
  if (labelLength > MAXIMUM_POPOVER_WIDTH_CHAR_COUNT) {
    return MAXIMUM_POPOVER_WIDTH;
  }
  if (labelLength > MINIMUM_POPOVER_WIDTH_CHAR_COUNT) {
    const overflownChars = labelLength - MINIMUM_POPOVER_WIDTH_CHAR_COUNT;
    return MINIMUM_POPOVER_WIDTH + overflownChars * AVERAGE_CHAR_WIDTH;
  }
  return MINIMUM_POPOVER_WIDTH;
}
