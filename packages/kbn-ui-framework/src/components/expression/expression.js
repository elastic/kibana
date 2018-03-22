import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiExpression = ({
  children,
  className,
  ...rest
}) => {
  const classes = classNames('kuiExpression', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiExpression.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};
