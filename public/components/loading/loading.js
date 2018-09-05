import React from 'react';
import PropTypes from 'prop-types';
import { EuiLoadingSpinner, EuiIcon } from '@elastic/eui';

export const Loading = ({ animated, text }) => {
  if (animated) {
    return (
      <div className="canvasLoading">
        {text && (
          <span>
            {text}
            &nbsp;
          </span>
        )}
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  return (
    <div className="canvasLoading">
      {text && (
        <span>
          {text}
          &nbsp;
        </span>
      )}
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
