import React from 'react';
import PropTypes from 'prop-types';
import { RenderExpression } from '../render_expression';

import './workpad.less';

export const Workpad = ({ elements, deselectElement }) => {
  return (
    <div className="canvas__workpad" onClick={deselectElement}>
      { elements.map(element => (<RenderExpression key={element.id} element={element} />)) }
    </div>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array,
  deselectElement: PropTypes.func,
};
