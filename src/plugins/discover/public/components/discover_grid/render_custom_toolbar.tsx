/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import './render_custom_toolbar.scss';

export const renderCustomToolbar: UnifiedDataTableProps['renderCustomToolbar'] = (
  {
    hasRoomForGridControls,
    columnControl,
    columnSortingControl,
    fullScreenControl,
    keyboardShortcutsControl,
    displayControl,
  },
  { additionalControls }
) => {
  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="s"
      justifyContent="spaceBetween"
      alignItems="center"
      className="dscGridToolbar"
      wrap
    >
      <EuiFlexItem grow={false}>
        {hasRoomForGridControls && (
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
            {columnControl && (
              <EuiFlexItem grow={false}>
                <div className="dscGridToolbarControlGroup">
                  <div className="dscGridToolbarControl">{columnControl}</div>
                </div>
              </EuiFlexItem>
            )}
            {columnSortingControl && (
              <EuiFlexItem grow={false}>
                <div className="dscGridToolbarControlGroup">
                  <div className="dscGridToolbarControl">{columnSortingControl}</div>
                </div>
              </EuiFlexItem>
            )}
            {additionalControls && (
              <EuiFlexItem grow={false}>
                <div className="dscGridToolbarControlGroup">
                  <div className="dscGridToolbarControl">{additionalControls}</div>
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {(keyboardShortcutsControl || displayControl || fullScreenControl) && (
          <div className="dscGridToolbarControlGroup">
            {keyboardShortcutsControl && (
              <div className="dscGridToolbarControl">{keyboardShortcutsControl}</div>
            )}
            {displayControl && <div className="dscGridToolbarControl">{displayControl}</div>}
            {fullScreenControl && <div className="dscGridToolbarControl">{fullScreenControl}</div>}
          </div>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
