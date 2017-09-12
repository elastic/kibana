import React from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';
import { ShapePicker } from '../../components/shape_picker/shape_picker.js';

const template = ({ argValue, onValueChange }) => {
  const onChange = val => onValueChange(val);

  return (
    <div className="canvas__argtype--shape-simple">
      <ShapePicker value={argValue} onSelect={onChange} />
    </div>
  );
};

template.propTypes = {
  argValue: PropTypes.string,
  onValueChange: PropTypes.func,
};

export const shape = () => new ArgType('shape', {
  displayName: 'Shape',
  description: 'Shappe selector',
  defaultValue: 'circle',
  simpleTemplate: template,
});
