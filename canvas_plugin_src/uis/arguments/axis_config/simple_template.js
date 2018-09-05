import React from 'react';
import PropTypes from 'prop-types';
import { EuiSwitch } from '@elastic/eui';

export const SimpleTemplate = ({ onValueChange, argValue }) => (
  <EuiSwitch checked={Boolean(argValue)} onChange={() => onValueChange(!Boolean(argValue))} />
);

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

SimpleTemplate.displayName = 'AxisConfigSimpleInput';
