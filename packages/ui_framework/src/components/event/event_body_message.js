import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiEventBodyMessage = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEventBody__message', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiEventBodyMessage.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
