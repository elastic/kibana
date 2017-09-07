import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel } from 'react-bootstrap';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { LabeledSelect } from '../../../components/labeled_select';

const paddings = [['0px', 'None'], '1px', '2px', '3px', '4px', '5px', '6px', '7px', '8px', '9px', '10px'];
const opacities = [[1, '100%'], [0.9, '90%'], [0.7, '70%'], [0.5, '50%'], [0.3, '30%'], [0.1, '10%']];

export const AppearanceForm = ({ className, padding, opacity, backgroundColor, onChange }) => {
  const namedChange = name => ev => onChange(name, ev.target.value);

  return (
    <div className={className}>
      <LabeledSelect
        className="padding"
        label="Padding"
        value={padding}
        values={paddings}
        onChange={namedChange('padding')}
      />

      <LabeledSelect
        className="opacity"
        label="Opacity"
        value={opacity}
        values={opacities}
        onChange={namedChange('opacity')}
      />

      <div className="border-color">
        <ColorPickerMini
          value={backgroundColor}
          onChange={color => onChange('backgroundColor', color)} />
        <ControlLabel>BG Color</ControlLabel>
      </div>
    </div>
  );
};

AppearanceForm.propTypes = {
  padding: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  backgroundColor: PropTypes.string,
  opacity: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};
