import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiCardDescription = ({ children, className, ...rest }) => {
  const classes = classNames('kuiCard__description', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiCardDescription.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
