import React from 'react';
import PropTypes from 'prop-types';
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';
import './loading.less';

export const Loading = ({ animated, text }) => {
  if (animated) {
    return (
      <div className="canvas__loading">
        {text && <span>{text}&nbsp;</span>}
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  return (
    <div className="canvas__loading">
      {text && <span>{text}&nbsp;</span>}
      <EuiIcon type="clock" />
    </div>
  );
};

Loading.propTypes = {
  animated: PropTypes.bool,
  text: PropTypes.string,
};

Loading.defaultProps = {
  animated: false,
  text: '',
};
