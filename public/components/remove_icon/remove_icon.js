import React from 'react';
import PropTypes from 'prop-types';
import { EuiIcon } from '@elastic/eui';

export const RemoveIcon = ({ onClick, className }) => (
  <div className={`canvasRemove ${className}`} onClick={onClick}>
    <EuiIcon type="cross" className="canvasRemove__icon" />
  </div>
);

RemoveIcon.propTypes = {
  onClick: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.string,
};
