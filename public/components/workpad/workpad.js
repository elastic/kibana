import React from 'react';
import PropTypes from 'prop-types';
import { ElementWrapper } from '../element_wrapper';

import './workpad.less';

export const Workpad = ({ elements, deselectElement, style }) => {
  return (
    <div className="canvas__workpad" onClick={deselectElement} style={style}>
      { elements.map(element => (<ElementWrapper key={element.id} element={element} />)) }
    </div>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array,
  style: PropTypes.object,
  deselectElement: PropTypes.func,
};
