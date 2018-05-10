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
          onChange={(evt) => {
            props.handleParentChange(props.controlIndex, evt);
          }}
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
        id={`multiselect-${props.controlIndex}`}
      >
        <EuiSwitch
          label="Multiselect"
          checked={props.controlParams.options.multiselect}
          onChange={(evt) => {
            props.handleCheckboxOptionChange(props.controlIndex, 'multiselect', evt);
          }}
          data-test-subj="listControlMultiselectInput"
        />
      </EuiFormRow>

      <EuiFormRow
        id={`dynamicOptions-${props.controlIndex}`}
      >
        <EuiSwitch
          label="Dynamic Options"
          checked={props.controlParams.options.dynamicOptions}
          onChange={(evt) => {
            props.handleCheckboxOptionChange(props.controlIndex, 'dynamicOptions', evt);
          }}
          data-test-subj="listControlDynamicOptionsSwitch"
        />
      </EuiFormRow>

      <EuiFormRow
        id={`size-${props.controlIndex}`}
        label="Size"
      >
        <EuiFieldNumber
          min={1}
          value={props.controlParams.options.size}
          onChange={(evt) => {
            props.handleNumberOptionChange(props.controlIndex, 'size', evt);
          }}
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
