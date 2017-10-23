import React from 'react';
import PropTypes from 'prop-types';
import './arg_add.less';

export const ArgAdd = ({ onValueAdd, displayName, help }) => {
  return (
    <div className="canvas__arg--add" onClick={onValueAdd}>
      <strong>{displayName}</strong><br/>
      {help}
    </div>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string,
  help: PropTypes.string,
  onValueAdd: PropTypes.func,
};
