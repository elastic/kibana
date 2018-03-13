import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiHeaderBar = ({ children, className, ...rest }) => {
  const classes = classNames('kuiHeaderBar', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiHeaderBar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
