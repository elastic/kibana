/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBoxOptionOption,
  EuiComboBoxProps,
  EuiFormRow,
  htmlIdGenerator,
  DragDropContextProps,
} from '@elastic/eui';

import { FieldSelectItem } from './field_select_item';
import { IndexPatternValue, SanitizedFieldType } from '../../../../../common/types';
import { TimeseriesUIRestrictions } from '../../../../../common/ui_restrictions';
import { getIndexPatternKey } from '../../../../../common/index_patterns_utils';
import { MultiFieldSelect } from './multi_field_select';
import {
  addNewItem,
  deleteItem,
  swapItems,
  getGroupedOptions,
  findInGroupedOptions,
  INVALID_FIELD_ID,
  MAX_MULTI_FIELDS_ITEMS,
  updateItem,
} from './field_select_utils';

interface FieldSelectProps {
  label: string | ReactNode;
  type: string;
  uiRestrictions?: TimeseriesUIRestrictions;
  restrict?: string[];
  value?: string | Array<string | null> | null;
  fields: Record<string, SanitizedFieldType[]>;
  indexPattern: IndexPatternValue;
  onChange: (selectedValues: Array<string | null>) => void;
  disabled?: boolean;
  placeholder?: string;
  allowMultiSelect?: boolean;
  'data-test-subj'?: string;
  fullWidth?: boolean;
}

const getPreselectedFields = (
  placeholder?: string,
  options?: Array<EuiComboBoxOptionOption<string>>
) => placeholder && findInGroupedOptions(options, placeholder)?.label;

export function FieldSelect({
  label,
  fullWidth,
  type,
  value,
  fields,
  indexPattern,
  uiRestrictions,
  restrict,
  onChange,
  disabled,
  placeholder,
  allowMultiSelect = false,
  'data-test-subj': dataTestSubj,
}: FieldSelectProps) {
  const htmlId = htmlIdGenerator();
  const fieldsSelector = getIndexPatternKey(indexPattern);
  const selectedIds = useMemo(() => [value ?? null].flat(), [value]);

  const groupedOptions = useMemo(
    () => getGroupedOptions(type, selectedIds, fields[fieldsSelector], uiRestrictions, restrict),
    [fields, fieldsSelector, restrict, selectedIds, type, uiRestrictions]
  );

  const selectedOptionsMap = useMemo(() => {
    const map = new Map<string, EuiComboBoxProps<string>['selectedOptions']>();
    if (selectedIds) {
      const addIntoSet = (item: string) => {
        const option = findInGroupedOptions(groupedOptions, item);
        if (option) {
          map.set(item, [option]);
        } else {
          map.set(item, [{ label: item, id: INVALID_FIELD_ID }]);
        }
      };

      selectedIds.forEach((v) => v && addIntoSet(v));
    }
    return map;
  }, [groupedOptions, selectedIds]);

  const invalidSelectedOptions = useMemo(
    () =>
      [...selectedOptionsMap.values()]
        .flat()
        .filter((item) => item?.label && item?.id === INVALID_FIELD_ID)
        .map((item) => item!.label),
    [selectedOptionsMap]
  );

  const onFieldSelectItemChange = useCallback(
    (index: number = 0, [selectedItem]) => {
      onChange(updateItem(selectedIds, selectedItem?.value, index));
    },
    [selectedIds, onChange]
  );

  const onNewItemAdd = useCallback(
    (index?: number) => onChange(addNewItem(selectedIds, index)),
    [selectedIds, onChange]
  );

  const onDeleteItem = useCallback(
    (index?: number) => onChange(deleteItem(selectedIds, index)),
    [onChange, selectedIds]
  );

  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (destination && source.index !== destination?.index) {
        onChange(swapItems(selectedIds, source.index, destination.index));
      }
    },
    [onChange, selectedIds]
  );

  const FieldSelectItemFactory = useMemo(
    () => (props: { value?: string | null; index?: number }) =>
      (
        <FieldSelectItem
          options={groupedOptions}
          selectedOptions={(props.value ? selectedOptionsMap.get(props.value) : undefined) ?? []}
          disabled={disabled}
          onNewItemAdd={onNewItemAdd.bind(undefined, props.index)}
          onDeleteItem={onDeleteItem.bind(undefined, props.index)}
          onChange={onFieldSelectItemChange.bind(undefined, props.index)}
          placeholder={getPreselectedFields(placeholder, groupedOptions)}
          disableAdd={!allowMultiSelect || selectedIds?.length >= MAX_MULTI_FIELDS_ITEMS}
          disableDelete={!allowMultiSelect || selectedIds?.length <= 1}
        />
      ),
    [
      groupedOptions,
      selectedOptionsMap,
      disabled,
      onNewItemAdd,
      onDeleteItem,
      onFieldSelectItemChange,
      placeholder,
      allowMultiSelect,
      selectedIds?.length,
    ]
  );

  return (
    <EuiFormRow
      id={htmlId('fieldSelect')}
      label={label}
      error={i18n.translate('visTypeTimeseries.fieldSelect.fieldIsNotValid', {
        defaultMessage:
          'The "{fieldParameter}" selection is not valid for use with the current index.',
        values: {
          fieldParameter: invalidSelectedOptions.join(', '),
        },
      })}
      fullWidth={fullWidth}
      isInvalid={Boolean(invalidSelectedOptions.length)}
      data-test-subj={dataTestSubj ?? 'metricsIndexPatternFieldsSelect'}
    >
      {selectedIds?.length > 1 ? (
        <MultiFieldSelect
          values={selectedIds}
          onDragEnd={onDragEnd}
          WrappedComponent={FieldSelectItemFactory}
        />
      ) : (
        <FieldSelectItemFactory value={selectedIds?.[0]} />
      )}
    </EuiFormRow>
  );
}
