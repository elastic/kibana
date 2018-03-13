import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryItemIcon = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryItem__icon', 'kuiIcon', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGalleryItemIcon.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
