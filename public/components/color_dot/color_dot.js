import React from 'react';
import PropTypes from 'prop-types';
import './color_dot.less';

export const ColorDot = ({ value, children }) => {
  return (
    <div className="canvas__color-dot">
      <div className="canvas__color-dot--background canvas__checkered"/>
      <div className="canvas__color-dot--foreground" style={{ background: value }}>
        {children}
      </div>
    </div>
  );
};

ColorDot.propTypes = {
  value: PropTypes.string,
  children: PropTypes.node,
};
