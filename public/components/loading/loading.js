import React from 'react';
import PropTypes from 'prop-types';
import './loading.less';

export const Loading = ({ animated, text }) => {
  if (animated) {
    return (
      <div className="canvas__loading">
        {text} <i className="fa fa-spinner fa-pulse" />
      </div>
    );
  }

  return (
    <div className="canvas__loading">
      {text} <i className="fa fa-clock-o" />
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
