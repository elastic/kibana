import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { ElementWrapper } from '../element_wrapper';
import { Fullscreen } from '../fullscreen';
import './workpad.less';

export const Workpad = (props) => {
  const { elements, style, workpad, fetchAllRenderables, undoHistory, redoHistory, nextPage, previousPage, isFullscreen } = props;
  const { height, width } = workpad;
  const itsTheNewStyle = Object.assign({}, style, { height, width });

  const keyHandler = (action) => {
    if (action === 'REFRESH') return fetchAllRenderables();
    if (action === 'UNDO') return undoHistory();
    if (action === 'REDO') return redoHistory();
    if (action === 'PREV') return previousPage();
    if (action === 'NEXT') return nextPage();
  };

  return (
      <div className="canvas__checkered" style={{ height, width }}>
        {!isFullscreen &&
          <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global/>
        }

        <Fullscreen>
          {({ isFullscreen, windowSize }) => {
            const scale = Math.min(windowSize.height / height, windowSize.width / width);
            const fsStyle = (!isFullscreen) ? {} : {
              WebkitTransform: `scale3d(${scale}, ${scale}, 1)`,
              msTransform: `scale3d(${scale}, ${scale}, 1)`,
              transform: `scale3d(${scale}, ${scale}, 1)`,
            };

            return (
                <div
                  className={`canvas__workpad ${isFullscreen ? 'fullscreen' : ''}`}
                  style={{ ...itsTheNewStyle, ...fsStyle }}
                >
                  { isFullscreen &&
                    <Shortcuts
                      name="PRESENTATION"
                      handler={keyHandler}
                      targetNodeSelector="body"
                    />
                  }

                  { elements.map(element => (
                    <ElementWrapper key={element.id} element={element} />
                  ))}
                </div>
            );
          }}
        </Fullscreen>
      </div>
  );
};

Workpad.propTypes = {
  elements: PropTypes.array.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  workpad: PropTypes.object.isRequired,
  undoHistory: PropTypes.func.isRequired,
  redoHistory: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  fetchAllRenderables: PropTypes.func.isRequired,
  style: PropTypes.object,
};
