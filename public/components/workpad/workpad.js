import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { ElementWrapper } from '../element_wrapper';
import './workpad.less';

export const Workpad = ({ elements, style, workpad, undoHistory, redoHistory }) => {
  const { height, width } = workpad;
  const itsTheNewStyle = Object.assign({}, style, { height, width });

  const keyboardHandler = (action) => {
    if (action === 'UNDO') return undoHistory();
    if (action === 'REDO') return redoHistory();
  };

  return (
    <Shortcuts name="WORKPAD" handler={keyboardHandler} targetNodeSelector="body" global>
      <div className="canvas__checkered" style={{ height, width }}>
        <div className="canvas__workpad" style={itsTheNewStyle}>
          { elements.map(element => (
            <ElementWrapper key={element.id} element={element} />
          ))}
        </div>
      </div>
    </Shortcuts>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array.isRequired,
  workpad: PropTypes.object.isRequired,
  undoHistory: PropTypes.func.isRequired,
  redoHistory: PropTypes.func.isRequired,
  style: PropTypes.object,
};
