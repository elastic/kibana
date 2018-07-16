import React from 'react';
import PropTypes from 'prop-types';
import aero from '../../lib/aeroelastic';

export const BorderResizeHandle = ({ transformMatrix }) => (
  <div
    className="canvas__border-resize-handle"
    style={{ transform: aero.dom.matrixToCSS(transformMatrix) }}
  />
);

BorderResizeHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
