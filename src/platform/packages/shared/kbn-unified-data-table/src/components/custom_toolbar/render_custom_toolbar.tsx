/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDataGridCustomToolbarProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import './render_custom_toolbar.scss';

export interface UnifiedDataTableRenderCustomToolbarProps {
  toolbarProps: EuiDataGridCustomToolbarProps;
  gridProps: {
    additionalControls?: React.ReactNode;
    inTableSearchControl?: React.ReactNode;
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
    gridProps: { additionalControls, inTableSearchControl },
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
            {Boolean(
              keyboardShortcutsControl ||
                displayControl ||
                fullScreenControl ||
                inTableSearchControl
            ) && (
              <EuiFlexItem grow={false}>
                <div className="unifiedDataTableToolbarControlGroup">
                  {Boolean(inTableSearchControl) && (
                    <div className="unifiedDataTableToolbarControlIconButton">
                      {inTableSearchControl}
                    </div>
                  )}
                  {Boolean(keyboardShortcutsControl) && (
                    <div className="unifiedDataTableToolbarControlIconButton">
                      {keyboardShortcutsControl}
                    </div>
                  )}
                  {Boolean(displayControl) && (
                    <div className="unifiedDataTableToolbarControlIconButton">{displayControl}</div>
                  )}
                  {Boolean(fullScreenControl) && (
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
