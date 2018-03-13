import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiCardDescriptionText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiCard__descriptionText', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiCardDescriptionText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
