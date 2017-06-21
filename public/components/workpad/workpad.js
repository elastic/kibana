import React from 'react';
import PropTypes from 'prop-types';
import { ElementWrapper } from '../element_wrapper';

import './workpad.less';

export const Workpad = ({ elements, deselectElement }) => {
  return (
    <div className="canvas__workpad" onClick={deselectElement}>
      { elements.map(element => (<ElementWrapper key={element.id} element={element} />)) }
    </div>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array,
  deselectElement: PropTypes.func,
};
