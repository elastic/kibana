import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { WorkpadPage } from '../workpad_page';
import { Fullscreen } from '../fullscreen';
import './workpad.less';

export const Workpad = props => {
  const {
    selectedPageId,
    pages,
    totalElementCount,
    workpad,
    fetchAllRenderables,
    undoHistory,
    redoHistory,
    setGrid, // TODO: Get rid of grid when we improve the layout engine
    grid,
    nextPage,
    previousPage,
    isFullscreen,
  } = props;

  const { height, width } = workpad;

  const keyHandler = action => {
    // handle keypress events for editor and presentation events
    // this exists in both contexts
    if (action === 'REFRESH') return fetchAllRenderables();

    // editor events
    if (action === 'UNDO') return undoHistory();
    if (action === 'REDO') return redoHistory();
    if (action === 'GRID') return setGrid(!grid);

    // presentation events
    if (action === 'PREV') return previousPage();
    if (action === 'NEXT') return nextPage();
  };

  return (
    <div className="canvas__checkered" style={{ height, width }}>
      {!isFullscreen && (
        <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
      )}

      <Fullscreen>
        {({ isFullscreen, windowSize }) => {
          const scale = Math.min(windowSize.height / height, windowSize.width / width);
          const transform = `scale3d(${scale}, ${scale}, 1)`;
          const fsStyle = !isFullscreen
            ? {}
            : {
                transform,
                WebkitTransform: transform,
                msTransform: transform,
                height,
                width,
              };

          // NOTE: the data-shared-* attributes here are used for reporting
          return (
            <div
              className={`canvas__workpad ${isFullscreen ? 'fullscreen' : ''}`}
              style={fsStyle}
              data-shared-items-count={totalElementCount}
            >
              {isFullscreen && (
                <Shortcuts
                  name="PRESENTATION"
                  handler={keyHandler}
                  targetNodeSelector="body"
                  global
                />
              )}
              {pages.map(page => (
                <WorkpadPage
                  key={page.id}
                  page={page}
                  isSelected={selectedPageId === page.id}
                  height={height}
                  width={width}
                />
              ))}
              <div
                className="canvas__grid"
                style={{ height, width, display: grid ? 'block' : 'none' }}
              />
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
  totalElementCount: PropTypes.number.isRequired,
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
