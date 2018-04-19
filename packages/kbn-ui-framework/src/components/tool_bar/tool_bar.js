import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiToolBar = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBar', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
