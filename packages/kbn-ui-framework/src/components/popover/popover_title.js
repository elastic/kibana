import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiPopoverTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPopoverTitle', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiPopoverTitle.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
