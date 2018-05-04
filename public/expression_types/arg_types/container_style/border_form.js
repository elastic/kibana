import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel } from 'react-bootstrap';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { LabeledInput } from '../../../components/labeled_input';

const styles = ['solid', 'dotted', 'dashed', 'double', 'groove', 'ridge', 'inset', 'outset'];

export const BorderForm = ({ className, value, radius, onChange, colors }) => {
  const border = value || '';
  const [borderWidth = '', borderStyle = '', borderColor = ''] = border.split(' ');
  const borderWidthVal = borderWidth ? borderWidth.replace('px', '') : '';
  const radiusVal = radius ? radius.replace('px', '') : '';

  const namedChange = name => ev => {
    const val = ev.target.value;

    if (name === 'borderWidth') return onChange('border', `${val}px ${borderStyle} ${borderColor}`);
    if (name === 'borderStyle') {
      if (val === '') return onChange('border', `0px`);
      return onChange('border', `${borderWidth} ${val} ${borderColor}`);
    }
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
        value={borderWidthVal}
        onChange={namedChange('borderWidth')}
      />

      <LabeledInput
        type="select"
        includeEmpty
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
        value={radiusVal}
        onChange={namedChange('borderRadius')}
      />

      <div className="border-color">
        <ColorPickerMini value={borderColor} onChange={borderColorChange} colors={colors} />
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
  colors: PropTypes.array.isRequired,
};
