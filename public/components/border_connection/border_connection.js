import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const BorderConnection = ({ transformMatrix, width, height }) => {
  const newStyle = {
    width,
    height,
    marginLeft: -width / 2,
    marginTop: -height / 2,
    position: 'absolute',
    transform: aero.dom.matrixToCSS(transformMatrix),
  };
  return <div className="canvasBorder--connection canvasLayoutAnnotation" style={newStyle} />;
};

BorderConnection.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
