/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/105731
// import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
type IFieldType = any;
type IIndexPattern = any;

import {
  getGenericComboBoxProps,
  GetGenericComboBoxPropsReturn,
} from '../get_generic_combo_box_props';

const AS_PLAIN_TEXT = { asPlainText: true };

interface OperatorProps {
  fieldInputWidth?: number;
  fieldTypeFilter?: string[];
  indexPattern: IIndexPattern | undefined;
  isClearable: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  isRequired?: boolean;
  onChange: (a: IFieldType[]) => void;
  placeholder: string;
  selectedField: IFieldType | undefined;
}

export const FieldComponent: React.FC<OperatorProps> = ({
  fieldInputWidth,
  fieldTypeFilter = [],
  indexPattern,
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  isRequired = false,
  onChange,
  placeholder,
  selectedField,
}): JSX.Element => {
  const [touched, setIsTouched] = useState(false);

  const { availableFields, selectedFields } = useMemo(
    () => getComboBoxFields(indexPattern, selectedField, fieldTypeFilter),
    [indexPattern, selectedField, fieldTypeFilter]
  );

  const { comboOptions, labels, selectedComboOptions } = useMemo(
    () => getComboBoxProps({ availableFields, selectedFields }),
    [availableFields, selectedFields]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const newValues: IFieldType[] = newOptions.map(
        ({ label }) => availableFields[labels.indexOf(label)]
      );
      onChange(newValues);
    },
    [availableFields, labels, onChange]
  );

  const handleTouch = useCallback((): void => {
    setIsTouched(true);
  }, [setIsTouched]);

  const fieldWidth = useMemo(() => {
    return fieldInputWidth ? { width: `${fieldInputWidth}px` } : {};
  }, [fieldInputWidth]);

  return (
    <EuiComboBox
      placeholder={placeholder}
      options={comboOptions}
      selectedOptions={selectedComboOptions}
      onChange={handleValuesChange}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isInvalid={isRequired ? touched && selectedField == null : false}
      onFocus={handleTouch}
      singleSelection={AS_PLAIN_TEXT}
      data-test-subj="fieldAutocompleteComboBox"
      style={fieldWidth}
      fullWidth
    />
  );
};

FieldComponent.displayName = 'Field';

interface ComboBoxFields {
  availableFields: IFieldType[];
  selectedFields: IFieldType[];
}

const getComboBoxFields = (
  indexPattern: IIndexPattern | undefined,
  selectedField: IFieldType | undefined,
  fieldTypeFilter: string[]
): ComboBoxFields => {
  const existingFields = getExistingFields(indexPattern);
  const selectedFields = getSelectedFields(selectedField);
  const availableFields = getAvailableFields(existingFields, selectedFields, fieldTypeFilter);

  return { availableFields, selectedFields };
};

const getComboBoxProps = (fields: ComboBoxFields): GetGenericComboBoxPropsReturn => {
  const { availableFields, selectedFields } = fields;

  return getGenericComboBoxProps<IFieldType>({
    getLabel: (field) => field.name,
    options: availableFields,
    selectedOptions: selectedFields,
  });
};

const getExistingFields = (indexPattern: IIndexPattern | undefined): IFieldType[] => {
  return indexPattern != null ? indexPattern.fields : [];
};

const getSelectedFields = (selectedField: IFieldType | undefined): IFieldType[] => {
  return selectedField ? [selectedField] : [];
};

const getAvailableFields = (
  existingFields: IFieldType[],
  selectedFields: IFieldType[],
  fieldTypeFilter: string[]
): IFieldType[] => {
  const fieldsByName = new Map<string, IFieldType>();

  existingFields.forEach((f) => fieldsByName.set(f.name, f));
  selectedFields.forEach((f) => fieldsByName.set(f.name, f));

  const uniqueFields = Array.from(fieldsByName.values());

  if (fieldTypeFilter.length > 0) {
    return uniqueFields.filter(({ type }) => fieldTypeFilter.includes(type));
  }

  return uniqueFields;
};
