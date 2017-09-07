import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel } from 'react-bootstrap';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { LabeledInput } from '../../../components/labeled_input';

const widths = [['0px', 'None'], '1px', '2px', '3px', '4px', '5px', '6px', '7px', '8px', '9px', '10px'];
const styles = ['solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset'];

export const BorderForm = ({ className, value, radius, onChange }) => {
  const border = value || '';
  const [ borderWidth, borderStyle, borderColor ] = border.split(' ');

  const namedChange = name => ev => {
    const val = ev.target.value;

    if (name === 'borderWidth') return onChange('border', `${val}px ${borderStyle} ${borderColor}`);
    if (name === 'borderStyle') return onChange('border', `${borderWidth} ${val} ${borderColor}`);
    if (name === 'borderRadius') return onChange('borderRadius', `${val}px`);

    onChange(name, ev.target.value);
  };

  const borderColorChange = color => onChange('border', `${borderWidth} ${borderStyle} ${color}`);

  return (
    <div className={className}>
      <LabeledInput
        type="number"
        className="border-width"
        label="Width"
        value={borderWidth.replace('px', '')}
        values={[ ...widths ]}
        onChange={namedChange('borderWidth')}
      />

      <LabeledInput
        type="select"
        className="border-style"
        label="Style"
        value={borderStyle}
        values={styles}
        onChange={namedChange('borderStyle')}
      />

      <LabeledInput
        type="number"
        className="border-radius"
        label="Radius"
        value={radius.replace('px', '')}
        values={[ ...widths ]}
        onChange={namedChange('borderRadius')}
      />

      <div className="border-color">
        <ColorPickerMini
          value={borderColor}
          onChange={borderColorChange} />
        <ControlLabel>Color</ControlLabel>
      </div>
    </div>
  );
};

BorderForm.propTypes = {
  value: PropTypes.string,
  radius: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};
