import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiControlledTable = ({ children, className, ...rest }) => {
  const classes = classNames('kuiControlledTable', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiControlledTable.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
