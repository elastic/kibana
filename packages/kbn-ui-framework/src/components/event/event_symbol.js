import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiEventSymbol = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEventSymbol', className);
  return (<div className={classes} {...rest} >{children}</div>);
};
KuiEventSymbol.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};
