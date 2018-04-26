import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const sizeToClassNameMap = {
  small: 'kuiTextInput--small',
  medium: undefined,
  large: 'kuiTextInput--large',
};

export const TEXTINPUT_SIZE = Object.keys(sizeToClassNameMap);

export const KuiTextInput = ({
  className,
  onChange,
  isInvalid,
  isDisabled,
  size,
  ...rest
}) => {
  const classes = classNames('kuiTextInput', className, {
    'kuiTextInput-isInvalid': isInvalid
  }, sizeToClassNameMap[size]
  );

  return (
    <input
      type="text"
      className={classes}
      onChange={onChange}
      disabled={isDisabled}
      {...rest}
    />
  );
};

KuiTextInput.defaultProps = {
  isInvalid: false,
  isDisabled: false,
  size: 'medium'
};

KuiTextInput.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  isInvalid: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(TEXTINPUT_SIZE)
};
