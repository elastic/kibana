import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const validGrowNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const KuiFlexItem = ({ children, className, grow, ...rest }) => {
  const classes = classNames(
    'kuiFlexItem',
    {
      'kuiFlexItem--flexGrowZero': !grow,
      [`kuiFlexItem--flexGrow${grow}`]: validGrowNumbers.indexOf(grow) >= 0,
    },
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFlexItem.propTypes = {
  children: PropTypes.node,
  grow: growPropType,
};

function growPropType(props, propName, componentName) {
  const value = props[propName];

  const validValues = [
    null, undefined,
    true, false,
    ...validGrowNumbers
  ];

  if (validValues.indexOf(value) === -1) {
    return new Error(
      `Prop \`${propName}\` supplied to \`${componentName}\` must be a boolean or an integer between 1 and 10.`
    );
  }
}

KuiFlexItem.defaultProps = {
  grow: true,
};
