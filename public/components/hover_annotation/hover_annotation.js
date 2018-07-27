import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const HoverAnnotation = ({ transformMatrix, a, b }) => {
  const newStyle = {
    width: a * 2,
    height: b * 2,
    marginLeft: -a,
    marginTop: -b,
    transform: aero.dom.matrixToCSS(transformMatrix),
  };
  return <div className="canvasHoverAnnotation" style={newStyle} />;
};

HoverAnnotation.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  a: PropTypes.number.isRequired,
  b: PropTypes.number.isRequired,
};
