import React from 'react';
import PropTypes from 'prop-types';

export const Fullscreen = ({ ident, isFullscreen, windowSize, children }) => (
  <div id={ident} allowFullScreen>
    {children({ isFullscreen, windowSize })}
  </div>
);

Fullscreen.propTypes = {
  ident: PropTypes.string.isRequired,
  isFullscreen: PropTypes.bool,
  windowSize: PropTypes.object,
  children: PropTypes.func,
};
