import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiToolBarText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBarText', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBarText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
