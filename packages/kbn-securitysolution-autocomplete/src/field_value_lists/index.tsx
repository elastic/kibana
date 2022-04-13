/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useFindLists } from '@kbn/securitysolution-list-hooks';
import { DataViewFieldBase } from '@kbn/es-query';

import { filterFieldToList } from '../filter_field_to_list';
import { getGenericComboBoxProps } from '../get_generic_combo_box_props';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/100715
// import { HttpStart } from 'kibana/public';
type HttpStart = any;

import * as i18n from '../translations';

const SINGLE_SELECTION = { asPlainText: true };

interface AutocompleteFieldListsProps {
  httpService: HttpStart;
  isClearable: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  onChange: (arg: ListSchema) => void;
  placeholder: string;
  rowLabel?: string;
  selectedField: DataViewFieldBase | undefined;
  selectedValue: string | undefined;
}

export const AutocompleteFieldListsComponent: React.FC<AutocompleteFieldListsProps> = ({
  httpService,
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  onChange,
  placeholder,
  rowLabel,
  selectedField,
  selectedValue,
}): JSX.Element => {
  const [error, setError] = useState<string | undefined>(undefined);
  const [lists, setLists] = useState<ListSchema[]>([]);
  const { loading, result, start } = useFindLists();
  const getLabel = useCallback(({ name }) => name, []);

  const optionsMemo = useMemo(
    () => filterFieldToList(lists, selectedField),
    [lists, selectedField]
  );
  const selectedOptionsMemo = useMemo(() => {
    if (selectedValue != null) {
      const list = lists.filter(({ id }) => id === selectedValue);
      return list ?? [];
    } else {
      return [];
    }
  }, [selectedValue, lists]);
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    () =>
      getGenericComboBoxProps<ListSchema>({
        getLabel,
        options: optionsMemo,
        selectedOptions: selectedOptionsMemo,
      }),
    [optionsMemo, selectedOptionsMemo, getLabel]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const [newValue] = newOptions.map(({ label }) => optionsMemo[labels.indexOf(label)]);
      onChange(newValue ?? '');
    },
    [labels, optionsMemo, onChange]
  );

  const setIsTouchedValue = useCallback((): void => {
    setError(selectedValue == null ? i18n.FIELD_REQUIRED_ERR : undefined);
  }, [selectedValue]);

  useEffect(() => {
    if (result != null) {
      setLists(result.data);
    }
  }, [result]);

  useEffect(() => {
    if (selectedField != null && httpService != null) {
      start({
        http: httpService,
        pageIndex: 1,
        pageSize: 500,
      });
    }
  }, [selectedField, start, httpService]);

  const isLoadingState = useMemo((): boolean => isLoading || loading, [isLoading, loading]);

  return (
    <EuiFormRow label={rowLabel} error={error} isInvalid={error != null} fullWidth>
      <EuiComboBox
        async
        data-test-subj="valuesAutocompleteComboBox listsComboxBox"
        fullWidth
        isClearable={isClearable}
        isDisabled={isDisabled}
        isInvalid={error != null}
        isLoading={isLoadingState}
        onBlur={setIsTouchedValue}
        onChange={handleValuesChange}
        options={comboOptions}
        placeholder={placeholder}
        selectedOptions={selectedComboOptions}
        singleSelection={SINGLE_SELECTION}
        sortMatchesBy="startsWith"
      />
    </EuiFormRow>
  );
};

AutocompleteFieldListsComponent.displayName = 'AutocompleteFieldList';
