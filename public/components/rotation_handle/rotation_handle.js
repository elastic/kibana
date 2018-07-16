import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const RotationHandle = ({ transformMatrix }) => (
  <div
    className="canvas__rotation-handle-connector"
    style={{ transform: aero.dom.matrixToCSS(transformMatrix) }}
  >
    <div className="canvas__rotation-handle" />
  </div>
);

RotationHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
