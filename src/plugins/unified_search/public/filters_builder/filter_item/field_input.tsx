/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { useGeneratedHtmlId, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { getFilterableFields } from '../../filter_bar/filter_editor';
import { FiltersBuilderContextType } from '../context';
import {
  MIDDLE_TRUNCATION_PROPS,
  SINGLE_SELECTION_AS_TEXT_PROPS,
} from '../../filter_bar/filter_editor/lib/helpers';

export const strings = {
  getFieldSelectPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.fieldSelectPlaceholder', {
      defaultMessage: 'Select a field',
    }),
};

interface FieldInputProps {
  dataView: DataView;
  onHandleField: (field: DataViewField) => void;
  field?: DataViewField;
}

export function FieldInput({ field, dataView, onHandleField }: FieldInputProps) {
  const { disabled, suggestionsAbstraction } = useContext(FiltersBuilderContextType);
  const fields = dataView ? getFilterableFields(dataView) : [];
  const id = useGeneratedHtmlId({ prefix: 'fieldInput' });
  const comboBoxWrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFieldChange = useCallback(
    ([selectedField]: DataViewField[]) => {
      onHandleField(selectedField);
    },
    [onHandleField]
  );

  const getLabel = useCallback(
    (dataViewField: DataViewField) => {
      let label = dataViewField.customLabel || dataViewField.name;
      if (suggestionsAbstraction?.fields[dataViewField.name]) {
        label = suggestionsAbstraction?.fields[dataViewField.name]?.displayField ?? label;
      }
      return {
        label,
        value: dataViewField.type as KBN_FIELD_TYPES,
        prepend: <FieldIcon type={dataViewField.type} fill="none" className="eui-alignMiddle" />,
      };
    },
    [suggestionsAbstraction]
  );

  const optionFields = fields.map(getLabel);
  const euiOptions: Array<EuiComboBoxOptionOption<KBN_FIELD_TYPES>> = optionFields;
  const selectedEuiOptions = (field ? [field] : [])
    .filter((option) => fields.indexOf(option) !== -1)
    .map((option) => euiOptions[fields.indexOf(option)]);

  const onComboBoxChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(
      ({ label }) => fields[optionFields.findIndex((optionField) => optionField.label === label)]
    );
    onFieldChange(newValues);

    setTimeout(() => {
      // Note: requires a tick skip to correctly blur element focus
      inputRef?.current?.blur();
    });
  };

  const handleFocus: React.FocusEventHandler<HTMLDivElement> = () => {
    // Force focus on input due to https://github.com/elastic/eui/issues/7170
    inputRef?.current?.focus();
  };

  return (
    <div ref={comboBoxWrapperRef}>
      <EuiComboBox
        id={id}
        inputRef={(ref) => {
          inputRef.current = ref;
        }}
        options={euiOptions}
        selectedOptions={selectedEuiOptions}
        onChange={onComboBoxChange}
        isDisabled={disabled}
        placeholder={strings.getFieldSelectPlaceholderLabel()}
        sortMatchesBy="startsWith"
        aria-label={strings.getFieldSelectPlaceholderLabel()}
        isClearable={false}
        compressed
        fullWidth
        onFocus={handleFocus}
        data-test-subj="filterFieldSuggestionList"
        singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
        truncationProps={MIDDLE_TRUNCATION_PROPS}
      />
    </div>
  );
}
