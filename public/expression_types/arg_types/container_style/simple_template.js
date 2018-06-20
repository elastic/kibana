import React from 'react';
import PropTypes from 'prop-types';
import { ColorPickerMini } from '../../../components/color_picker_mini';

export const SimpleTemplate = ({ getArgValue, setArgValue, workpad }) => (
  <div style={{ fontSize: 0 }}>
    <ColorPickerMini
      value={getArgValue('backgroundColor')}
      onChange={color => setArgValue('backgroundColor', color)}
      colors={workpad.colors}
      anchorPosition="leftCenter"
    />
  </div>
);

SimpleTemplate.displayName = 'ContainerStyleArgSimpleInput';

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }),
};
