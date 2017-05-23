import React from 'react';
import PropTypes from 'prop-types';

export const Toggle = ({ value, onChange }) => {
  const classNames = ['fa', value ? 'fa-toggle-on' : 'fa-toggle-off'].join(' ');

  return (
    <i onClick={() => {onChange(!value);}} className={classNames} />
  );
};

Toggle.propTypes = {
  value: PropTypes.bool,
  onChange: PropTypes.func,
};
