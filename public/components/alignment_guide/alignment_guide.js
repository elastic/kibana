import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const AlignmentGuide = ({ transformMatrix, a, b }) => {
  const newStyle = {
    width: a * 2,
    height: b * 2,
    marginLeft: -a,
    marginTop: -b,
    background: 'magenta',
    position: 'absolute',
    transform: aero.dom.matrixToCSS(transformMatrix),
  };
  return <div className="canvas__alignment-guide canvas__interactable" style={newStyle} />;
};

AlignmentGuide.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  a: PropTypes.number.isRequired,
  b: PropTypes.number.isRequired,
};
