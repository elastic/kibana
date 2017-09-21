import React from 'react';
import PropTypes from 'prop-types';
import './arg_add.less';

export const ArgAdd = ({ onValueAdd, displayName }) => {
  return (
    <div className="canvas__arg--add" onClick={onValueAdd}>
      {displayName}
    </div>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string,
  onValueAdd: PropTypes.func,
};
