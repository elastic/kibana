/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
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
import { FieldSearch } from './field_search';

interface Props {
  indexPattern: IndexPattern;
}

interface State {
  selectedField: IndexPatternField;
}

const FieldPicker = ({ indexPattern }: Props) => {
  const [nameFilter, setNameFilter] = useState<string>('');
  const [selectedField, setSelectedField] = useState<IndexPatternField | null>(null);

  const onSearchUpdate = (name: string, value: string | boolean | undefined) => {
    if (name === 'name') {
      setNameFilter(`${value}`);
    }
  };

  const fields = indexPattern.fields;

  return (
    <EuiFlexGroup direction="column" alignItems="stretch" gutterSize="s">
      <EuiFlexItem grow={false}>
        {/** ttypes list should be extracted from the indexPattern */}
        <FieldSearch onChange={onSearchUpdate} value={nameFilter} types={['string']} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiListGroup bordered={true}>
          {fields.map((f, i) => {
            return (
              <EuiListGroupItem key={f.name}>
                <FieldButton 
                  size="s"
                  isActive={f.name === selectedField?.name}
                  fieldName={f.name}
                  fieldIcon={<FieldIcon type={f.type} label={f.name} scripted={f.scripted} />}
                />
              </EuiListGroupItem>
            );
          })}
        </EuiListGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
