import React from 'react';
import PropTypes from 'prop-types';
import './color_dot.less';


export const ColorDot = ({ value, children }) => {
  /*
  const background = color === 'rgba(255,255,255,0)' ?
  {
    backgroundImage: `
      linear-gradient(45deg, #aaa 25%, transparent 25%),
      linear-gradient(-45deg, #aaa 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #aaa 75%),
      linear-gradient(-45deg, transparent 75%, #aaa 75%)`,
    backgroundSize: '8px 8px',
  } :
  { background: color };
  */

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
