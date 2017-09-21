import React from 'react';
import PropTypes from 'prop-types';
import './remove_icon.less';

export const RemoveIcon = ({ onClick, style, className }) => (
  <div className={className} style={{ height: 20, width: 20, ...style }} onClick={onClick}>
    <div className="canvas__remove-icon--background" />
    <div className="canvas__remove-icon--foreground">
      <i className={`fa fa-times-circle canvas__remove-icon `} />
    </div>

  </div>

);

RemoveIcon.propTypes = {
  onClick: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.string,
};
