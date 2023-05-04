/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useFindListsBySize } from '@kbn/securitysolution-list-hooks';
import { DataViewFieldBase } from '@kbn/es-query';
import { getDocLinks } from '@kbn/doc-links';

import { filterFieldToList } from '../filter_field_to_list';
import { getGenericComboBoxProps } from '../get_generic_combo_box_props';

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/100715
// import { HttpStart } from '@kbn/core/public';
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
  allowLargeValueLists?: boolean;
}

export interface AutocompleteListsData {
  smallLists: ListSchema[];
  largeLists: ListSchema[];
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
  allowLargeValueLists = false,
}): JSX.Element => {
  const [error, setError] = useState<string | undefined>(undefined);
  const [listData, setListData] = useState<AutocompleteListsData>({
    smallLists: [],
    largeLists: [],
  });
  const { loading, result, start } = useFindListsBySize();
  const getLabel = useCallback(({ name }) => name, []);

  const optionsMemo = useMemo(
    () => filterFieldToList(listData, selectedField),
    [listData, selectedField]
  );
  const selectedOptionsMemo = useMemo(() => {
    if (selectedValue != null) {
      const combinedLists = [...listData.smallLists, ...listData.largeLists];
      const list = combinedLists.filter(({ id }) => id === selectedValue);
      return list ?? [];
    } else {
      return [];
    }
  }, [selectedValue, listData]);
  const { comboOptions, labels, selectedComboOptions } = useMemo(
    () =>
      getGenericComboBoxProps<ListSchema>({
        getLabel,
        options: [...optionsMemo.smallLists, ...optionsMemo.largeLists],
        selectedOptions: selectedOptionsMemo,
        disabledOptions: allowLargeValueLists ? undefined : optionsMemo.largeLists, // Disable large lists if the rule type doesn't allow it
      }),
    [optionsMemo, selectedOptionsMemo, getLabel, allowLargeValueLists]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const combinedLists = [...optionsMemo.smallLists, ...optionsMemo.largeLists];
      const [newValue] = newOptions.map(({ label }) => combinedLists[labels.indexOf(label)]);
      onChange(newValue ?? '');
    },
    [labels, optionsMemo, onChange]
  );

  const setIsTouchedValue = useCallback((): void => {
    setError(selectedValue == null ? i18n.FIELD_REQUIRED_ERR : undefined);
  }, [selectedValue]);

  useEffect(() => {
    if (result != null) {
      setListData(result);
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

  const helpText = useMemo(() => {
    return (
      !allowLargeValueLists && (
        <EuiText size="xs">
          {i18n.LISTS_TOOLTIP_INFO}{' '}
          <EuiLink
            external
            target="_blank"
            href={getDocLinks({ kibanaBranch: 'main' }).securitySolution.exceptions.value_lists}
          >
            {i18n.SEE_DOCUMENTATION}
          </EuiLink>
        </EuiText>
      )
    );
  }, [allowLargeValueLists]);

  return (
    <EuiFormRow
      label={rowLabel}
      error={error}
      isInvalid={error != null}
      helpText={helpText}
      fullWidth
    >
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
