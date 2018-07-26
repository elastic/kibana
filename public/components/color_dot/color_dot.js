import React from 'react';
import PropTypes from 'prop-types';

export const ColorDot = ({ value, children }) => {
  return (
    <div className="canvasColorDot">
      <div className="canvasColorDot__background canvasCheckered" />
      <div className="canvasColorDot__foreground" style={{ background: value }}>
        {children}
      </div>
    </div>
  );
};

ColorDot.propTypes = {
  value: PropTypes.string,
  children: PropTypes.node,
  handleClick: PropTypes.func,
};
