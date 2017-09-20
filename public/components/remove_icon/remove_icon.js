import React from 'react';
import PropTypes from 'prop-types';
import './remove_icon.less';

export const RemoveIcon = ({ onClick, style, className }) => (
  <i className={`fa fa-times-circle canvas__remove-icon ${className}`} style={style} onClick={onClick}/>
);

RemoveIcon.propTypes = {
  onClick: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.string,
};
