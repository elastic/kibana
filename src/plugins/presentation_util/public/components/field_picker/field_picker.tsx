/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { sortBy, filter, uniq } from 'lodash';
import {
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  // EuiPopover,
  // EuiPopoverFooter,
  // EuiPopoverTitle,
  // EuiSelect,
  // EuiSwitch,
  // EuiSwitchEvent,
  // EuiForm,
  // EuiFormRow,
  // EuiButtonGroup,
  // EuiOutsideClickDetector,
  // EuiFilterButton,
  // EuiSpacer,
} from '@elastic/eui';
import { IndexPatternField, IndexPattern } from '../../../../data/public';
import { FieldIcon, FieldButton } from '../../../../kibana_react/public';
// import { i18n } from '@kbn/i18n';
import { FieldSearch, DataType } from './field_search';

import './field_picker.scss';

export interface Props {
  indexPattern: IndexPattern | null;
}

// interface State {
//   selectedField: IndexPatternField;
// }

export const FieldPicker = ({ indexPattern }: Props) => {
  const [nameFilter, setNameFilter] = useState<string>('');
  const [typesFilter, setTypesFilter] = useState<DataType[]>([]);
  const [selectedField, setSelectedField] = useState<IndexPatternField | null>(null);
  const fields = indexPattern
    ? sortBy(
        indexPattern.fields.filter(
          (f) =>
            f.name.includes(nameFilter) &&
            (typesFilter.length === 0 || typesFilter.includes(f.type as DataType))
        ),
        ['name']
      )
    : [];

  const uniqueTypes = indexPattern ? uniq(indexPattern.fields.map((f) => f.type as DataType)) : [];

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="stretch"
      gutterSize="s"
      className={`presFieldPicker__container ${
        !indexPattern && 'presFieldPicker__container--disabled'
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
          {!indexPattern && (
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem>
                <EuiText color="subdued">No index pattern selected</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {indexPattern && fields.length === 0 && (
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              alignItems="center"
              justifyContent="center"
            >
              <EuiFlexItem>
                <EuiText color="subdued">No matching fields</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiPanel>
      </EuiFlexItem>
      {selectedField && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>Selected field:</h4>
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
