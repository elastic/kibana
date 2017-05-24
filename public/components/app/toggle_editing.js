import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../toggle';

export const ToggleEditing = ({ value, toggle }) => (
  <span className="canvas__app--editToggle"> <Toggle value={value} onChange={toggle} /></span>
);

ToggleEditing.propTypes = {
  value: PropTypes.bool,
  toggle: PropTypes.func,
};
