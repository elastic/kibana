/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { sortBy, uniq } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldIcon } from '@kbn/react-field/field_icon';
import { FieldButton } from '@kbn/react-field/field_button';

import { DataView, DataViewField } from '../../../../data_views/common';

import { FieldSearch } from './field_search';

import './field_picker.scss';

export interface Props {
  dataView: DataView | null;
  filterPredicate?: (f: DataViewField) => boolean;
}

export const FieldPicker = ({ dataView, filterPredicate }: Props) => {
  const [nameFilter, setNameFilter] = useState<string>('');
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<DataViewField | null>(null);

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

  const uniqueTypes = dataView ? uniq(dataView.fields.map((f) => f.type as string)) : [];

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
                      className="presFieldPicker__fieldButton"
                      onClick={() => setSelectedField(f)}
                      isActive={f.name === selectedField?.name}
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
      {selectedField && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="presentationUtil.fieldPicker.selectedFieldLabel"
                defaultMessage="Selected Field"
              />
            </h4>
          </EuiTitle>
          <div>
            <FieldButton
              size="m"
              fieldName={selectedField.name}
              fieldIcon={
                <FieldIcon
                  type={selectedField.type}
                  label={selectedField.name}
                  scripted={selectedField.scripted}
                />
              }
            />
          </div>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
