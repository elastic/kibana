import React from 'react';
import PropTypes from 'prop-types';

export function PanelError({ error }) {
  return (
    <div className="load-error">
      <span aria-hidden="true" className="kuiIcon fa-exclamation-triangle"/>
      <span>{error}</span>
    </div>
  );
}

PanelError.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]),
};

