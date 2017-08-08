import React from 'react';
import PropTypes from 'prop-types';
import './palette_swatch.less';


export const PaletteSwatch = ({ colors, gradient }) => {


  let colorBoxes;

  if (!gradient) {
    colorBoxes = colors.map(color => (
      <div
        key={color}
        className="canvas__palette-swatch--box"
        style={{
          backgroundColor: color,
        }}/>
    ));
  } else {
    colorBoxes = [(<div
      key="gradient"
      className="canvas__palette-swatch--box"
      style={{
        background: `linear-gradient(90deg, ${colors.join(', ')})`,
      }}/>
    )];
  }


  return (
    <div className="canvas__palette-swatch">
      <div className="canvas__palette-swatch--background canvas__checkered"/>
      <div className="canvas__palette-swatch--foreground">
        {colorBoxes}
      </div>
    </div>
  );
};

PaletteSwatch.propTypes = {
  colors: PropTypes.array,
  gradient: PropTypes.bool,
};
