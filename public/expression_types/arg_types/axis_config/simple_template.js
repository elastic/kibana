import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../../../components/toggle';

const isEnabled = argValue => typeof argValue !== 'boolean' || argValue !== false;

export const SimpleTemplate = ({ onValueChange, argValue }) => (
  <div className="canvas__argtype--axis_config--enable">
    <Toggle value={isEnabled(argValue)} onChange={onValueChange} />
  </div>
);

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

SimpleTemplate.displayName = 'AxisConfigSimpleInput';
