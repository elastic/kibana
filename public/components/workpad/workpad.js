import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { PageStack } from '../page_stack';
import { Fullscreen } from '../fullscreen';
import './workpad.less';

export const Workpad = ({
  selectedPageId,
  pages,
  style,
  workpad,
  fetchAllRenderables,
  undoHistory,
  redoHistory,
  setGrid, // TODO: Get rid of grid when we improve the layout engine
  grid,
  nextPage,
  previousPage,
  isFullscreen,
}) => {
  const { height, width } = workpad;

  // TODO: I think this is mixing in background color, that should be pushed down to a page component, otherwise reporting wont work right
  const itsTheNewStyle = Object.assign({}, style, { height, width });

  const keyHandler = (action) => {
    if (action === 'REFRESH') return fetchAllRenderables();
    if (action === 'UNDO') return undoHistory();
    if (action === 'REDO') return redoHistory();
    if (action === 'PREV') return previousPage();
    if (action === 'NEXT') return nextPage();
    if (action === 'GRID') return setGrid(!grid);
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
                  <PageStack pages={pages} selectedPageId={selectedPageId} height={height} width={width} />
                  <div className="canvas__grid" style={{ height, width, display: grid ? 'block' : 'none' }}/>
                </div>
            );
          }}
        </Fullscreen>
      </div>
  );
};

Workpad.propTypes = {
  grid: PropTypes.bool.isRequired,
  setGrid: PropTypes.func.isRequired,
  pages: PropTypes.array.isRequired,
  selectedPageId: PropTypes.string.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  workpad: PropTypes.object.isRequired,
  undoHistory: PropTypes.func.isRequired,
  redoHistory: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  fetchAllRenderables: PropTypes.func.isRequired,
  style: PropTypes.object,
};
