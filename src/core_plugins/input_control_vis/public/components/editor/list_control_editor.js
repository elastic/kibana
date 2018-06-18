/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

import {
  EuiFormRow,
  EuiFieldNumber,
  EuiSwitch,
  EuiSelect,
} from '@elastic/eui';

function filterField(field) {
  return field.aggregatable && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type);
}

export function ListControlEditor(props) {
  const multiselectId = `multiselect-${props.controlIndex}`;
  const sizeId = `size-${props.controlIndex}`;
  const handleMultiselectChange = (evt) => {
    props.handleCheckboxOptionChange(props.controlIndex, 'multiselect', evt);
  };
  const handleSizeChange = (evt) => {
    props.handleNumberOptionChange(props.controlIndex, 'size', evt);
  };
  const handleParentChange = (evt) => {
    props.handleParentChange(props.controlIndex, evt);
  };

  let parentSelect;
  if (props.parentCandidates && props.parentCandidates.length > 0) {
    const options = [
      { value: '', text: '' },
      ...props.parentCandidates,
    ];
    parentSelect = (
      <EuiFormRow
        id={`parentSelect-${props.controlIndex}`}
        label="Parent control"
        helpText="Options are based on the value of parent control. Disabled if parent is not set."
      >
        <EuiSelect
          options={options}
          value={props.controlParams.parent}
          onChange={handleParentChange}
        />
      </EuiFormRow>
    );
  }

  return (
    <div>

      <IndexPatternSelect
        indexPatternId={props.controlParams.indexPattern}
        onChange={props.handleIndexPatternChange}
        getIndexPatterns={props.getIndexPatterns}
        getIndexPattern={props.getIndexPattern}
        controlIndex={props.controlIndex}
      />

      <FieldSelect
        fieldName={props.controlParams.fieldName}
        indexPatternId={props.controlParams.indexPattern}
        filterField={filterField}
        onChange={props.handleFieldNameChange}
        getIndexPattern={props.getIndexPattern}
        controlIndex={props.controlIndex}
      />

      { parentSelect }

      <EuiFormRow
        id={multiselectId}
      >
        <EuiSwitch
          label="Multiselect"
          checked={props.controlParams.options.multiselect}
          onChange={handleMultiselectChange}
          data-test-subj="listControlMultiselectInput"
        />
      </EuiFormRow>

      <EuiFormRow
        id={sizeId}
        label="Size"
      >
        <EuiFieldNumber
          min={1}
          value={props.controlParams.options.size}
          onChange={handleSizeChange}
          data-test-subj="listControlSizeInput"
        />
      </EuiFormRow>

    </div>
  );
}

ListControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleCheckboxOptionChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired,
  parentCandidates: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  })).isRequired,
  handleParentChange: PropTypes.func.isRequired,
};
