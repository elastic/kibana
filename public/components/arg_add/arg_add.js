import React from 'react';
import PropTypes from 'prop-types';
import './arg_add.less';

export const ArgAdd = ({ onValueAdd, displayName, description }) => {
  return (
    <div className="canvas__arg--add" onClick={onValueAdd}>
      <strong>{displayName}</strong><br/>
      {description}
    </div>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string,
  description: PropTypes.string,
  onValueAdd: PropTypes.func,
};
