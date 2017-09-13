import PropTypes from 'prop-types';
import React from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

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
      />

      <FieldSelect
        value={props.controlParams.fieldName}
        indexPatternId={props.controlParams.indexPattern}
        filterField={filterField}
        onChange={props.handleFieldNameChange}
        getIndexPattern={props.getIndexPattern}
      />

      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor={stepSizeId}>
          Step Size
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <input
            id={stepSizeId}
            className="kuiTextInput"
            type="number"
            value={props.controlParams.options.step}
            onChange={handleStepChange}
          />
        </div>
      </div>

      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor={decimalPlacesId}>
          Decimal Places
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <input
            id={decimalPlacesId}
            className="kuiTextInput"
            type="number"
            min="0"
            value={props.controlParams.options.decimalPlaces}
            onChange={handleDecimalPlacesChange}
          />
        </div>
      </div>

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
