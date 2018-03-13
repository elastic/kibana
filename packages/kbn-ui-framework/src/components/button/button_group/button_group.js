import PropTypes from 'prop-types';
import React from 'react';

import classNames from 'classnames';

const KuiButtonGroup = props => {
  const classes = classNames('kuiButtonGroup', {
    'kuiButtonGroup--united': props.isUnited,
  });

  return (
    <div className={classes} role="group">
      {props.children}
    </div>
  );
};

KuiButtonGroup.propTypes = {
  children: PropTypes.node,
  isUnited: PropTypes.bool,
};

export { KuiButtonGroup };
