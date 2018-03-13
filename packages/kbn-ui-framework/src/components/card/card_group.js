import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiCardGroup = ({ children, className, isUnited, ...rest }) => {
  const classes = classNames('kuiCardGroup', className, { 'kuiCardGroup--united': isUnited });
  return <div className={classes} role="group" {...rest}>{children}</div>;
};

KuiCardGroup.defaultProps = {
  isUnited: false
};

KuiCardGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isUnited: PropTypes.bool
};
