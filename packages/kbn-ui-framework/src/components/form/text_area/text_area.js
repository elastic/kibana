import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const sizeToClassNameMap = {
  small: 'kuiTextArea--small',
  medium: undefined,
  large: 'kuiTextArea--large',
};

export const TEXTAREA_SIZE = Object.keys(sizeToClassNameMap);

export const KuiTextArea = ({
  className,
  onChange,
  isInvalid,
  isNonResizable,
  isDisabled,
  size,
  ...rest
}) => {
  const classes = classNames('kuiTextArea', className, {
    'kuiTextArea-isInvalid': isInvalid,
    'kuiTextArea--nonResizable': isNonResizable
  }, sizeToClassNameMap[size]
  );

  return (
    <textarea
      className={classes}
      onChange={onChange}
      disabled={isDisabled}
      {...rest}
    />
  );
};

KuiTextArea.defaultProps = {
  isInvalid: false,
  isNonResizable: false,
  isDisabled: false,
  size: 'medium'
};

KuiTextArea.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  isInvalid: PropTypes.bool,
  isNonResizable: PropTypes.bool,
  isDisabled: PropTypes.bool,
  size: PropTypes.oneOf(TEXTAREA_SIZE)
};
