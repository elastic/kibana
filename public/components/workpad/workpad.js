import React from 'react';
import PropTypes from 'prop-types';
import { ElementWrapper } from '../element_wrapper';

import './workpad.less';

export const Workpad = ({ elements, deselectElement, style, workpad }) => {
  const { height, width } = workpad;
  const itsTheNewStyle = Object.assign({}, style, { height, width });

  return (
    <div className="canvas__workpad" onMouseDown={deselectElement} style={itsTheNewStyle}>
      { elements.map(element => (
          <ElementWrapper key={element.id} element={element} />
      ))
      }
    </div>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array,
  style: PropTypes.object,
  deselectElement: PropTypes.func,
  workpad: PropTypes.object,
};
