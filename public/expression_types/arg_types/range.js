import React from 'react';
import PropTypes from 'prop-types';
import { EuiRange } from '@elastic/eui';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

const RangeArgInput = ({ typeInstance, onValueChange, argValue }) => {
  const { min, max, step } = typeInstance;
  const handleChange = ev => {
    return onValueChange(ev.target.value);
  };

  return (
    <EuiRange
      compressed
      min={min}
      max={max}
      step={step}
      showLabels
      showInput
      value={argValue}
      onChange={handleChange}
    />
  );
};

RangeArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  typeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    min: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    step: PropTypes.number.isRequired,
  }),
  argId: PropTypes.string.isRequired,
};

export const range = () => ({
  name: 'range',
  displayName: 'Range',
  help: 'Slider for values within a range',
  simpleTemplate: templateFromReactComponent(RangeArgInput),
});
