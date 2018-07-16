import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const BorderConnection = ({ transformMatrix, a, b }) => {
  const newStyle = {
    width: a * 2,
    height: b * 2,
    marginLeft: -a,
    marginTop: -b,
    position: 'absolute',
    transform: aero.dom.matrixToCSS(transformMatrix),
  };
  return <div className="canvas__border-connection" style={newStyle} />;
};

BorderConnection.propTypes = {
  a: PropTypes.number.isRequired,
  b: PropTypes.number.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
