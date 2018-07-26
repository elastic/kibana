import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, EuiButton } from '@elastic/eui';
import { Tooltip } from '../tooltip';
import { AssetManager } from '../asset_manager';
import { ElementTypes } from '../element_types';
import { FullscreenControl } from '../fullscreen_control';
import { RefreshControl } from '../refresh_control';
import { Popover } from '../popover';

export const WorkpadHeader = ({ editing, toggleEditing, hasAssets, addElement }) => {
  const keyHandler = action => {
    if (action === 'EDITING') toggleEditing();
  };

  const elementsButton = handleClick => (
    <EuiButton fill size="s" iconType="vector" onClick={handleClick}>
      Add element
    </EuiButton>
  );

  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <RefreshControl />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FullscreenControl>
                {({ toggleFullscreen }) => (
                  <Tooltip position="bottom" content="Toggle fullscreen mode">
                    <EuiButtonIcon
                      iconType="fullScreen"
                      aria-label="View fullscreen"
                      onClick={toggleFullscreen}
                    />
                  </Tooltip>
                )}
              </FullscreenControl>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
              <Tooltip
                position="bottom"
                content={editing ? 'Hide editing controls' : 'Show editing controls'}
              >
                <EuiButtonIcon
                  iconType={editing ? 'eye' : 'eyeClosed'}
                  onClick={() => {
                    toggleEditing();
                  }}
                  size="s"
                  aria-label={editing ? 'Hide editing controls' : 'Show editing controls'}
                />
              </Tooltip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {editing ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {hasAssets && (
                <EuiFlexItem grow={false}>
                  <AssetManager />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <Popover
                  button={elementsButton}
                  withTitle
                  anchorPosition="downRight"
                  panelClassName="canvasPopover--elements"
                >
                  {({ closePopover }) => (
                    <ElementTypes
                      onClick={element => {
                        addElement(element);
                        closePopover();
                      }}
                    />
                  )}
                </Popover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};

WorkpadHeader.propTypes = {
  editing: PropTypes.bool,
  toggleEditing: PropTypes.func,
  hasAssets: PropTypes.bool,
  addElement: PropTypes.func.isRequired,
};
