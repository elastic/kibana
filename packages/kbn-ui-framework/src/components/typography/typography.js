import PropTypes from 'prop-types';
import { cloneElement } from 'react';
import classNames from 'classnames';

const sizeToClassNameMap = {
  small: 'kuiTitle--small',
  large: 'kuiTitle--large',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiTitle = ({ size, children, className, ...rest }) => {
  const classes = classNames('kuiTitle', sizeToClassNameMap[size], className);

  const props = {
    className: classes,
    ...rest
  };

  return cloneElement(children, props);
};

KuiTitle.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(SIZES),
};

export const KuiText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiText', className);

  const props = {
    className: classes,
    ...rest
  };

  return cloneElement(children, props);
};

KuiText.propTypes = {
  children: PropTypes.node.isRequired,
};
