import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const sizeToClassNameMap = {
  small: 'kuiSelect--small',
  medium: undefined,
  large: 'kuiSelect--large',
};

export const SELECT_SIZE = Object.keys(sizeToClassNameMap);

export const KuiSelect = ({
  className,
  onChange,
  isInvalid,
  isDisabled,
  size,
  children,
  ...rest
}) => {
  const classes = classNames('kuiSelect', className, {
    'kuiSelect-isInvalid': isInvalid
  }, sizeToClassNameMap[size]);

  return (
    <select
      className={classes}
      onChange={onChange}
      disabled={isDisabled}
      {...rest}
    >
      {children}
    </select>
  );
};

KuiSelect.defaultProps = {
  isInvalid: false,
  isDisabled: false,
  size: 'medium'
};

KuiSelect.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  isInvalid: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(SELECT_SIZE),
  children: PropTypes.node
};
