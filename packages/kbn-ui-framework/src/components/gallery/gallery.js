import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGallery = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGallery', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGallery.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
