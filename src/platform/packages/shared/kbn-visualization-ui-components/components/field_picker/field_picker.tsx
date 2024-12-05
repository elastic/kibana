/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './field_picker.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { FieldIcon } from '@kbn/field-utils/src/components/field_icon';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import type { FieldOptionValue, FieldOption } from './types';

export interface FieldPickerProps<T extends FieldOptionValue>
  extends EuiComboBoxProps<FieldOption<T>['value']> {
  options: Array<FieldOption<T>>;
  activeField: EuiComboBoxOptionOption<FieldOption<T>['value']> | undefined;
  onChoose: (choice: T | undefined) => void;
  onDelete?: () => void;
  fieldIsInvalid: boolean;
  'data-test-subj'?: string;
}

const MIDDLE_TRUNCATION_PROPS = { truncation: 'middle' as const };
const SINGLE_SELECTION_AS_TEXT_PROPS = { asPlainText: true };

export function FieldPicker<T extends FieldOptionValue = FieldOptionValue>(
  props: FieldPickerProps<T>
) {
  const {
    activeField,
    options,
    onChoose,
    onDelete,
    fieldIsInvalid,
    ['data-test-subj']: dataTestSub,
    ...rest
  } = props;

  const [selectedOption, setSelectedOption] = React.useState(activeField);

  let maxLabelLength = 0;
  const styledOptions = options?.map(({ compatible, exists, ...otherAttr }) => {
    if (otherAttr.options) {
      return {
        ...otherAttr,
        options: otherAttr.options.map(({ exists: fieldOptionExists, ...fieldOption }) => {
          if (fieldOption.label.length > maxLabelLength) {
            maxLabelLength = fieldOption.label.length;
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

  return (
    <EuiComboBox
      fullWidth
      compressed
      isClearable={false}
      data-test-subj={dataTestSub ?? 'indexPattern-dimension-field'}
      placeholder={i18n.translate('visualizationUiComponents.fieldPicker.fieldPlaceholder', {
        defaultMessage: 'Select a field',
      })}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={styledOptions}
      isInvalid={fieldIsInvalid}
      selectedOptions={selectedOption ? [selectedOption] : []}
      singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
      truncationProps={MIDDLE_TRUNCATION_PROPS}
      inputPopoverProps={{
        panelMinWidth: calculateWidthFromCharCount(maxLabelLength),
        anchorPosition: 'downRight',
      }}
      onBlur={() => {
        if (!selectedOption) {
          setSelectedOption(activeField);
        }
      }}
      onChange={(choices) => {
        const firstChoice = choices.at(0);
        if (!firstChoice) {
          setSelectedOption(undefined);
          onDelete?.();
          return;
        }
        if (firstChoice.value !== activeField?.value) {
          setSelectedOption({
            label: firstChoice.label,
            value: firstChoice.value,
          });
        }
        onChoose(firstChoice.value);
      }}
      {...rest}
    />
  );
}
