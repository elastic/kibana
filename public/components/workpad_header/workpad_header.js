import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { Toggle } from '../toggle';
import { FullscreenControl } from '../fullscreen_control';
import { RefreshControl } from '../refresh_control';
import './workpad_header.less';

const btnClass = 'canvas__workpad_header--button';

export const WorkpadHeader = ({ workpadName, editing, toggleEditing }) => {
  const keyHandler = action => {
    if (action === 'EDITING') toggleEditing();
  };

  return (
    <div className="canvas__workpad_header">
      <h2>
        {workpadName}

        <RefreshControl className={`canvas__workpad_header--refresh ${btnClass}`} />

        <FullscreenControl>
          {({ toggleFullscreen }) => (
            <span className={`canvas__workpad_header--fullscreenControl ${btnClass}`}>
              <i className="fa fa-play" onClick={toggleFullscreen} />
            </span>
          )}
        </FullscreenControl>

        <span className={`canvas__workpad_header--editToggle ${btnClass}`}>
          <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
          <Toggle value={editing} onChange={toggleEditing} />
        </span>
      </h2>
    </div>
  );
};

WorkpadHeader.propTypes = {
  workpadName: PropTypes.string,
  editing: PropTypes.bool,
  toggleEditing: PropTypes.func,
};
