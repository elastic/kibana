import React from 'react';
import PropTypes from 'prop-types';
import { RenderExpression } from '../render_expression';

export const Workpad = ({ elements }) => {
  return (
    <div className="canvas__workpad">
      { elements.map(element => (<RenderExpression key={element.id} element={element} />)) }
    </div>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array,
};