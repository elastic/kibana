import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../toggle';

export const ToggleEdit = ({ editing, toggle }) => {

  return (
    <Toggle value={editing} onChange={toggle}/>
  );
};

ToggleEdit.propTypes = {
  editing: PropTypes.bool,
  toggle: PropTypes.func,
};
