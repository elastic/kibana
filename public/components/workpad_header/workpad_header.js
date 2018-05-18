import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { EuiIcon, EuiSwitch, EuiTitle, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FullscreenControl } from '../fullscreen_control';
import { RefreshControl } from '../refresh_control';
import './workpad_header.less';

export const WorkpadHeader = ({ workpadName, editing, toggleEditing }) => {
  const keyHandler = action => {
    if (action === 'EDITING') toggleEditing();
  };

  return (
    <div className="canvas__workpad_header">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h2 className="canvas__workpad_header--title">{workpadName}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RefreshControl />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FullscreenControl className={`clickable`}>
            {({ toggleFullscreen }) => <EuiIcon type="play" size="xl" onClick={toggleFullscreen} />}
          </FullscreenControl>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
            <EuiSwitch checked={editing} onChange={toggleEditing} />
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

WorkpadHeader.propTypes = {
  workpadName: PropTypes.string,
  editing: PropTypes.bool,
  toggleEditing: PropTypes.func,
};
