/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo, useState } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import {
  getGenericComboBoxProps,
  GetGenericComboBoxPropsReturn,
} from '../get_generic_combo_box_props';
import { ComboBoxFields, FieldBaseProps } from './types';

const getComboBoxFields = (
  indexPattern: DataViewBase | undefined,
  selectedField: DataViewFieldBase | undefined,
  fieldTypeFilter: string[] | undefined
): ComboBoxFields => {
  const existingFields = getExistingFields(indexPattern);
  const selectedFields = getSelectedFields(selectedField);
  const availableFields = getAvailableFields(existingFields, selectedFields, fieldTypeFilter);

  return { availableFields, selectedFields };
};

const getComboBoxProps = (fields: ComboBoxFields): GetGenericComboBoxPropsReturn => {
  const { availableFields, selectedFields } = fields;

  return getGenericComboBoxProps<DataViewFieldBase>({
    getLabel: (field) => field.name,
    options: availableFields,
    selectedOptions: selectedFields,
  });
};

const getExistingFields = (indexPattern: DataViewBase | undefined): DataViewFieldBase[] => {
  return indexPattern != null ? indexPattern.fields : [];
};

const getSelectedFields = (selectedField: DataViewFieldBase | undefined): DataViewFieldBase[] => {
  return selectedField ? [selectedField] : [];
};

const getAvailableFields = (
  existingFields: DataViewFieldBase[],
  selectedFields: DataViewFieldBase[],
  fieldTypeFilter: string[] | undefined
): DataViewFieldBase[] => {
  const fieldsByName = new Map<string, DataViewFieldBase>();

  existingFields.forEach((f) => fieldsByName.set(f.name, f));
  selectedFields.forEach((f) => fieldsByName.set(f.name, f));

  const uniqueFields = Array.from(fieldsByName.values());

  if (fieldTypeFilter && fieldTypeFilter?.length > 0) {
    return uniqueFields.filter(({ type }) => fieldTypeFilter.includes(type));
  }

  return uniqueFields;
};

export const useField = ({
  indexPattern,
  fieldTypeFilter,
  isRequired,
  selectedField,
  fieldInputWidth,
  onChange,
}: FieldBaseProps) => {
  const [touched, setIsTouched] = useState(false);

  const { availableFields, selectedFields } = useMemo(
    () => getComboBoxFields(indexPattern, selectedField, fieldTypeFilter),
    [indexPattern, fieldTypeFilter, selectedField]
  );

  const { comboOptions, labels, selectedComboOptions } = useMemo(
    () => getComboBoxProps({ availableFields, selectedFields }),
    [availableFields, selectedFields]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const newValues: DataViewFieldBase[] = newOptions.map(
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

  const isInvalid = useMemo(
    () => (isRequired ? touched && selectedField == null : false),
    [isRequired, selectedField, touched]
  );

  return {
    isInvalid,
    comboOptions,
    selectedComboOptions,
    fieldWidth,

    handleTouch,
    handleValuesChange,
  };
};
