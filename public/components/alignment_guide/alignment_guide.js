import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const AlignmentGuide = ({ transformMatrix, width, height }) => {
  const newStyle = {
    width,
    height,
    marginLeft: -width / 2,
    marginTop: -height / 2,
    background: 'magenta',
    position: 'absolute',
    transform: aero.dom.matrixToCSS(transformMatrix),
  };
  return (
    <div
      className="canvasAlignmentGuide canvasInteractable canvasLayoutAnnotation"
      style={newStyle}
    />
  );
};

AlignmentGuide.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};
