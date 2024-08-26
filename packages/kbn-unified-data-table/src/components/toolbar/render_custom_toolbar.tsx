/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiDataGridCustomToolbarProps,
  EuiDataGridToolBarVisibilityOptions,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import './render_custom_toolbar.scss';

export interface UnifiedDataTableRenderCustomToolbarProps {
  toolbarProps: EuiDataGridCustomToolbarProps;
  gridProps: {
    additionalControls?: EuiDataGridToolBarVisibilityOptions['additionalControls'];
  };
}

export type UnifiedDataTableRenderCustomToolbar = (
  props: UnifiedDataTableRenderCustomToolbarProps
) => React.ReactElement;

interface RenderCustomToolbarProps extends UnifiedDataTableRenderCustomToolbarProps {
  leftSide?: React.ReactElement;
  bottomSection?: React.ReactElement;
}

export const internalRenderCustomToolbar = (
  props: RenderCustomToolbarProps
): React.ReactElement => {
  const {
    leftSide,
    bottomSection,
    toolbarProps: {
      hasRoomForGridControls,
      columnControl,
      columnSortingControl,
      fullScreenControl,
      keyboardShortcutsControl,
      displayControl,
    },
    gridProps: { additionalControls },
  } = props;

  const buttons = hasRoomForGridControls ? (
    <>
      {leftSide && additionalControls && (
        <EuiFlexItem grow={false}>
          <div>{additionalControls}</div>
        </EuiFlexItem>
      )}
      {columnControl && (
        <EuiFlexItem grow={false}>
          <div className="unifiedDataTableToolbarControlButton">{columnControl}</div>
        </EuiFlexItem>
      )}
      {columnSortingControl && (
        <EuiFlexItem grow={false}>
          <div className="unifiedDataTableToolbarControlButton">{columnSortingControl}</div>
        </EuiFlexItem>
      )}
      {!leftSide && additionalControls && (
        <EuiFlexItem grow={false}>
          <div>{additionalControls}</div>
        </EuiFlexItem>
      )}
    </>
  ) : null;

  return (
    <>
      <EuiFlexGroup
        responsive={false}
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="center"
        className="unifiedDataTableToolbar"
        data-test-subj="unifiedDataTableToolbar"
        wrap
      >
        <EuiFlexItem grow={false}>
          {leftSide || (
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              {buttons}
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
            {Boolean(leftSide) && buttons}
            {(keyboardShortcutsControl || displayControl || fullScreenControl) && (
              <EuiFlexItem grow={false}>
                <div className="unifiedDataTableToolbarControlGroup">
                  {keyboardShortcutsControl && (
                    <div className="unifiedDataTableToolbarControlIconButton">
                      {keyboardShortcutsControl}
                    </div>
                  )}
                  {displayControl && (
                    <div className="unifiedDataTableToolbarControlIconButton">{displayControl}</div>
                  )}
                  {fullScreenControl && (
                    <div className="unifiedDataTableToolbarControlIconButton">
                      {fullScreenControl}
                    </div>
                  )}
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {bottomSection ? (
        <div
          className="unifiedDataTableToolbarBottom"
          data-test-subj="unifiedDataTableToolbarBottom"
        >
          {bottomSection}
        </div>
      ) : null}
    </>
  );
};

export const renderCustomToolbar: UnifiedDataTableRenderCustomToolbar = internalRenderCustomToolbar;

/**
 * Render custom element on the left side and all controls to the right
 */
export const getRenderCustomToolbarWithElements = ({
  leftSide,
  bottomSection,
}: {
  leftSide?: React.ReactElement;
  bottomSection?: React.ReactElement;
}): UnifiedDataTableRenderCustomToolbar => {
  const reservedSpace = <></>;
  return (props) =>
    internalRenderCustomToolbar({
      ...props,
      leftSide: leftSide || reservedSpace,
      bottomSection,
    });
};
