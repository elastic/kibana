import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFieldGroup = ({
  isAlignedTop,
  children,
  className,
  ...rest
}) => {
  const classes = classNames('kuiFieldGroup', className, {
    'kuiFieldGroup--alignTop': isAlignedTop
  });
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFieldGroup.defaultProps = {
  isAlignedTop: false
};

KuiFieldGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isAlignedTop: PropTypes.bool
};
