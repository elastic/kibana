/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import { sortBy, uniq } from 'lodash';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { FieldButton, FieldIcon } from '@kbn/react-field';

import { FieldSearch } from './field_search';
import { DataView, DataViewField } from '../../../../data_views/common';

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
  const [nameFilter, setNameFilter] = useState<string>('');
  const [typesFilter, setTypesFilter] = useState<string[]>([]);

  // Retrieve, filter, and sort fields from data view
  const fields = dataView
    ? sortBy(
        dataView.fields
          .filter(
            (f) =>
              f.name.includes(nameFilter) &&
              (typesFilter.length === 0 || typesFilter.includes(f.type as string))
          )
          .filter((f) => (filterPredicate ? filterPredicate(f) : true)),
        ['name']
      )
    : [];

  const uniqueTypes = dataView
    ? uniq(
        dataView.fields
          .filter((f) => (filterPredicate ? filterPredicate(f) : true))
          .map((f) => f.type as string)
      )
    : [];

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="stretch"
      gutterSize="s"
      className={`presFieldPicker__container ${
        !dataView && 'presFieldPicker__container--disabled'
      }`}
    >
      <EuiFlexItem grow={false}>
        <FieldSearch
          onSearchChange={(val) => setNameFilter(val)}
          searchValue={nameFilter}
          onFieldTypesChange={(types) => setTypesFilter(types)}
          fieldTypesValue={typesFilter}
          availableFieldTypes={uniqueTypes}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel
          paddingSize="s"
          hasShadow={false}
          hasBorder={true}
          className="presFieldPicker__fieldPanel"
        >
          {fields.length > 0 && (
            <EuiFlexGroup direction="column" gutterSize="none">
              {fields.map((f, i) => {
                return (
                  <EuiFlexItem key={f.name}>
                    <FieldButton
                      data-test-subj={`field-picker-select-${f.name}`}
                      className={classNames('presFieldPicker__fieldButton', {
                        presFieldPickerFieldButtonActive: f.name === selectedFieldName,
                      })}
                      onClick={() => {
                        onSelectField?.(f);
                      }}
                      isActive={f.name === selectedFieldName}
                      fieldName={f.name}
                      fieldIcon={<FieldIcon type={f.type} label={f.name} scripted={f.scripted} />}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          )}
          {!dataView && (
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem>
                <EuiText color="subdued">
                  <FormattedMessage
                    id="presentationUtil.fieldPicker.noDataViewLabel"
                    defaultMessage="No data view selected"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {dataView && fields.length === 0 && (
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem>
                <EuiText color="subdued">
                  <FormattedMessage
                    id="presentationUtil.fieldPicker.noFieldsLabel"
                    defaultMessage="No matching fields"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default FieldPicker;
