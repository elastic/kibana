/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  UnifiedDataTableRenderCustomToolbarProps,
  UnifiedDataTableRenderCustomToolbar,
} from '@kbn/unified-data-table';
import './render_custom_toolbar.scss';

interface RenderCustomToolbarProps extends UnifiedDataTableRenderCustomToolbarProps {
  leftSide?: React.ReactElement;
  bottomSection?: React.ReactElement;
}

export const renderCustomToolbar = (props: RenderCustomToolbarProps): React.ReactElement => {
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
          <div className="dscGridToolbarControlButton">{additionalControls}</div>
        </EuiFlexItem>
      )}
      {columnControl && (
        <EuiFlexItem grow={false}>
          <div className="dscGridToolbarControlButton">{columnControl}</div>
        </EuiFlexItem>
      )}
      {columnSortingControl && (
        <EuiFlexItem grow={false}>
          <div className="dscGridToolbarControlButton">{columnSortingControl}</div>
        </EuiFlexItem>
      )}
      {!leftSide && additionalControls && (
        <EuiFlexItem grow={false}>
          <div className="dscGridToolbarControlButton">{additionalControls}</div>
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
        className="dscGridToolbar"
        data-test-subj="dscGridToolbar"
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
                <div className="dscGridToolbarControlGroup">
                  {keyboardShortcutsControl && (
                    <div className="dscGridToolbarControlIconButton">
                      {keyboardShortcutsControl}
                    </div>
                  )}
                  {displayControl && (
                    <div className="dscGridToolbarControlIconButton">{displayControl}</div>
                  )}
                  {fullScreenControl && (
                    <div className="dscGridToolbarControlIconButton">{fullScreenControl}</div>
                  )}
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {bottomSection ? (
        <div className="dscGridToolbarBottom" data-test-subj="dscGridToolbarBottom">
          {bottomSection}
        </div>
      ) : null}
    </>
  );
};

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
    renderCustomToolbar({
      ...props,
      leftSide: leftSide || reservedSpace,
      bottomSection,
    });
};
