import React from 'react';
import PropTypes from 'prop-types';
import { EuiRange } from '@elastic/eui';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

// Same code as Range input, but converts values to percentage between 0 and 1 instead of 0 and 100
const PercentageArgInput = ({ typeInstance, onValueChange, argValue }) => {
  const { min, max } = typeInstance;
  const handleChange = ev => {
    return onValueChange(ev.target.value / 100);
  };

  return (
    <EuiRange
      compressed
      min={min}
      max={max}
      showLabels
      showInput
      value={argValue * 100}
      onChange={handleChange}
    />
  );
};

PercentageArgInput.propTypes = {
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

export const percentage = () => ({
  name: 'percentage',
  displayName: 'Percentage',
  help: 'Slider for percentage ',
  simpleTemplate: templateFromReactComponent(PercentageArgInput),
});
