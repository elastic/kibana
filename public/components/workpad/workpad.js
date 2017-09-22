import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { ElementWrapper } from '../element_wrapper';
import { Fullscreen } from '../fullscreen';
import './workpad.less';

export const Workpad = (props) => {
  const { elements, style, workpad, undoHistory, redoHistory, nextPage, previousPage } = props;
  const { height, width } = workpad;
  const itsTheNewStyle = Object.assign({}, style, { height, width });

  const workpadHandler = (action) => {
    if (action === 'UNDO') return undoHistory();
    if (action === 'REDO') return redoHistory();
  };

  const presentationHandler = isFullscreen => (action) => {
    if (!isFullscreen) return;
    if (action === 'PREV') return nextPage();
    if (action === 'NEXT') return previousPage();
  };

  return (
    <Shortcuts name="WORKPAD" handler={workpadHandler} targetNodeSelector="body" global>
      <div className="canvas__checkered" style={{ height, width }}>
        <Fullscreen>
          {({ isFullscreen, windowSize }) => {
            const scale = Math.min(windowSize.height / height, windowSize.width / width);
            const fsStyle = (!isFullscreen) ? {} : {
              WebkitTransform: `scale3d(${scale}, ${scale}, 1)`,
              msTransform: `scale3d(${scale}, ${scale}, 1)`,
              transform: `scale3d(${scale}, ${scale}, 1)`,
            };

            return (
              <Shortcuts
                name="PRESENTATION"
                handler={presentationHandler(isFullscreen)}
                targetNodeSelector="body"
              >
                <div
                  className={`canvas__workpad ${isFullscreen ? 'fullscreen' : ''}`}
                  style={{ ...itsTheNewStyle, ...fsStyle }}
                >
                  { elements.map(element => (
                    <ElementWrapper key={element.id} element={element} />
                  ))}
                </div>
              </Shortcuts>
            );
          }}
        </Fullscreen>
      </div>
    </Shortcuts>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array.isRequired,
  workpad: PropTypes.object.isRequired,
  undoHistory: PropTypes.func.isRequired,
  redoHistory: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  style: PropTypes.object,
};
