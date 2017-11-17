import React from 'react';
import PropTypes from 'prop-types';
import { ColorPickerMini } from '../../../components/color_picker_mini';

export const simpleTemplate = ({ getArgValue, setArgValue }) => (
  <div className="canvas__argtype--containerStyle-simple">
    <ColorPickerMini
      value={getArgValue('backgroundColor')}
      onChange={color => setArgValue('backgroundColor', color)} />
  </div>
);

simpleTemplate.displayName = 'ContainerStyleArgSimpleInput';

simpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
};
