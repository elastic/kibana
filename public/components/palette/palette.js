import React from 'react';
import _ from 'lodash';
import './palette.less';

export const Palette = ({colors, style}) => {
  return (
    <div className="rework--palette" style={style}>
      {_.map(colors, color => (
        <div key={color} style={{backgroundColor: color}} className="rework--palette-color"></div>
      ))}
    </div>
  );
};
