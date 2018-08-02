import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const RotationHandle = ({ transformMatrix }) => (
  <div
    className="canvasRotationHandle canvasRotationHandle--connector canvasLayoutAnnotation"
    style={{ transform: aero.dom.matrixToCSS(transformMatrix) }}
  >
    <div className="canvasRotationHandle--handle" />
  </div>
);

RotationHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
