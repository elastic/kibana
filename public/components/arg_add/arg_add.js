import React from 'react';
import PropTypes from 'prop-types';
import { Label } from 'react-bootstrap';
import './arg_add.less';

export const ArgAdd = ({ onValueAdd, displayName }) => {
  return (
    <div className="canvas__arg--add">
      <Label bsStyle="default" onClick={onValueAdd}>
        + {displayName}
      </Label>
    </div>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string,
  onValueAdd: PropTypes.func,
};
