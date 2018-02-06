import PropTypes from 'prop-types';
import React from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

import {
  EuiFormRow,
  EuiFieldNumber,
  EuiSwitch,
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

  return (
    <div>

      <IndexPatternSelect
        value={props.controlParams.indexPattern}
        onChange={props.handleIndexPatternChange}
        getIndexPatterns={props.getIndexPatterns}
      />

      <FieldSelect
        value={props.controlParams.fieldName}
        indexPatternId={props.controlParams.indexPattern}
        filterField={filterField}
        onChange={props.handleFieldNameChange}
        getIndexPattern={props.getIndexPattern}
      />

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
  handleNumberOptionChange: PropTypes.func.isRequired
};
