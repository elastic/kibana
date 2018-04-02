import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiActionItem = ({ children, className, ...rest }) => {
  const classes = classNames('kuiActionItem', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiActionItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
