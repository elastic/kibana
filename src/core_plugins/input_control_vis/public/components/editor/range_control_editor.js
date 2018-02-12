import PropTypes from 'prop-types';
import React from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

import {
  EuiFormRow,
  EuiFieldNumber,
} from '@elastic/eui';

function filterField(field) {
  return field.type === 'number';
}

export function RangeControlEditor(props) {
  const stepSizeId = `stepSize-${props.controlIndex}`;
  const decimalPlacesId = `decimalPlaces-${props.controlIndex}`;
  const handleDecimalPlacesChange = (evt) => {
    props.handleNumberOptionChange(props.controlIndex, 'decimalPlaces', evt);
  };
  const handleStepChange = (evt) => {
    props.handleNumberOptionChange(props.controlIndex, 'step', evt);
  };
  return (
    <div>

      <IndexPatternSelect
        value={props.controlParams.indexPattern}
        onChange={props.handleIndexPatternChange}
        getIndexPatterns={props.getIndexPatterns}
        controlIndex={props.controlIndex}
      />

      <FieldSelect
        value={props.controlParams.fieldName}
        indexPatternId={props.controlParams.indexPattern}
        filterField={filterField}
        onChange={props.handleFieldNameChange}
        getIndexPattern={props.getIndexPattern}
        controlIndex={props.controlIndex}
      />

      <EuiFormRow
        id={stepSizeId}
        label="Step Size"
      >
        <EuiFieldNumber
          value={props.controlParams.options.step}
          onChange={handleStepChange}
          data-test-subj={`rangeControlSizeInput${props.controlIndex}`}
        />
      </EuiFormRow>

      <EuiFormRow
        id={decimalPlacesId}
        label="Decimal Places"
      >
        <EuiFieldNumber
          min={0}
          value={props.controlParams.options.decimalPlaces}
          onChange={handleDecimalPlacesChange}
          data-test-subj={`rangeControlDecimalPlacesInput${props.controlIndex}`}
        />
      </EuiFormRow>

    </div>
  );
}

RangeControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired
};
