/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import { sortBy, uniq } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { EuiSelectable, EuiSelectableOption, EuiSpacer } from '@elastic/eui';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';

import { FieldTypeFilter } from './field_type_filter';

import './field_picker.scss';

export interface FieldPickerProps {
  dataView?: DataView;
  selectedFieldName?: string;
  filterPredicate?: (f: DataViewField) => boolean;
  onSelectField?: (selectedField: DataViewField) => void;
}

export const FieldPicker = ({
  dataView,
  onSelectField,
  filterPredicate,
  selectedFieldName,
}: FieldPickerProps) => {
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [fieldSelectableOptions, setFieldSelectableOptions] = useState<EuiSelectableOption[]>([]);

  const availableFields = useMemo(
    () =>
      sortBy(
        (dataView?.fields ?? [])
          .filter((f) => typesFilter.length === 0 || typesFilter.includes(f.type as string))
          .filter((f) => (filterPredicate ? filterPredicate(f) : true)),
        ['name']
      ),
    [dataView, filterPredicate, typesFilter]
  );

  useEffect(() => {
    if (!dataView) return;
    const options: EuiSelectableOption[] = (availableFields ?? []).map((field) => {
      return {
        key: field.name,
        label: field.displayName ?? field.name,
        className: classNames('presFieldPicker__fieldButton', {
          presFieldPickerFieldButtonActive: field.name === selectedFieldName,
        }),
        'data-test-subj': `field-picker-select-${field.name}`,
        prepend: (
          <FieldIcon
            type={field.type}
            label={field.name}
            scripted={field.scripted}
            className="eui-alignMiddle"
          />
        ),
      };
    });
    setFieldSelectableOptions(options);
  }, [availableFields, dataView, filterPredicate, selectedFieldName, typesFilter]);

  const uniqueTypes = useMemo(
    () =>
      dataView
        ? uniq(
            dataView.fields
              .filter((f) => (filterPredicate ? filterPredicate(f) : true))
              .map((f) => f.type as string)
          )
        : [],
    [dataView, filterPredicate]
  );

  const fieldTypeFilter = (
    <FieldTypeFilter
      onFieldTypesChange={(types) => setTypesFilter(types)}
      fieldTypesValue={typesFilter}
      availableFieldTypes={uniqueTypes}
    />
  );

  return (
    <EuiSelectable
      emptyMessage={i18n.translate('presentationUtil.fieldPicker.noFieldsLabel', {
        defaultMessage: 'No matching fields',
      })}
      aria-label={i18n.translate('presentationUtil.fieldPicker.selectableAriaLabel', {
        defaultMessage: 'Select a field',
      })}
      searchable
      options={fieldSelectableOptions}
      onChange={(options, _, changedOption) => {
        setFieldSelectableOptions(options);
        if (!dataView || !changedOption.key) return;
        const field = dataView.getFieldByName(changedOption.key);
        if (field) onSelectField?.(field);
      }}
      searchProps={{
        'data-test-subj': 'field-search-input',
        placeholder: i18n.translate('presentationUtil.fieldSearch.searchPlaceHolder', {
          defaultMessage: 'Search field names',
        }),
      }}
      listProps={{
        isVirtualized: true,
        showIcons: false,
        bordered: true,
      }}
      height={300}
    >
      {(list, search) => (
        <>
          {search}
          <EuiSpacer size={'s'} />
          {fieldTypeFilter}
          <EuiSpacer size={'s'} />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default FieldPicker;
