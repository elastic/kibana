import PropTypes from 'prop-types';
import { cloneElement } from 'react';
import classNames from 'classnames';


export const KuiScreenReaderOnly = ({ children }) => {
  const classes = classNames('kuiScreenReaderOnly', children.props.className);

  const props = {
    ...children.props,
    className: classes,
  };

  return cloneElement(children, props);
};

KuiScreenReaderOnly.propTypes = {
  children: PropTypes.node
};
