import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const HoverAnnotation = ({ transformMatrix, width, height }) => {
  const newStyle = {
    width,
    height,
    marginLeft: -width / 2,
    marginTop: -height / 2,
    transform: aero.dom.matrixToCSS(transformMatrix),
  };
  return <div className="canvasHoverAnnotation canvasLayoutAnnotation" style={newStyle} />;
};

HoverAnnotation.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};
