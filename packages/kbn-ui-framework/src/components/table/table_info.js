import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableInfo = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTableInfo', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiTableInfo.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
