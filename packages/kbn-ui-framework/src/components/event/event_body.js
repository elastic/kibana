import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiEventBody = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEventBody', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiEventBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
