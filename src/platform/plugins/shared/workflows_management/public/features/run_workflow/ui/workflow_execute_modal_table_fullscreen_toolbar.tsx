/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  renderCustomToolbar as defaultRenderCustomToolbar,
  type UnifiedDataTableRenderCustomToolbar,
} from '@kbn/unified-data-table';

/**
 * Replaces EuiDataGrid native fullscreen (position:fixed below modal z-index) with modal layout
 * expansion only, so the unified data table toolbar stays visible and aligned with the grid.
 */
export const wrapRenderCustomToolbarWithModalTableFullscreen = (
  renderCustomToolbar: UnifiedDataTableRenderCustomToolbar | undefined,
  isTableGridFullScreen: boolean,
  onTableGridFullScreenChange: (nextIsFullScreen: boolean) => void
): UnifiedDataTableRenderCustomToolbar => {
  const enterLabel = i18n.translate('workflows.workflowExecuteModal.tableFullScreenEnter', {
    defaultMessage: 'Enter fullscreen',
  });
  const exitLabel = i18n.translate('workflows.workflowExecuteModal.tableFullScreenExit', {
    defaultMessage: 'Exit fullscreen',
  });

  const modalFullScreenControl = (
    <EuiToolTip content={isTableGridFullScreen ? exitLabel : enterLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        size="xs"
        iconType={isTableGridFullScreen ? 'fullScreenExit' : 'fullScreen'}
        color="text"
        aria-pressed={isTableGridFullScreen}
        data-test-subj="dataGridFullScreenButton"
        onClick={() => onTableGridFullScreenChange(!isTableGridFullScreen)}
        aria-label={isTableGridFullScreen ? exitLabel : enterLabel}
      />
    </EuiToolTip>
  );

  return (props) => {
    const nextProps = {
      ...props,
      toolbarProps: {
        ...props.toolbarProps,
        fullScreenControl: modalFullScreenControl,
        hasRoomForGridControls: props.toolbarProps.hasRoomForGridControls || isTableGridFullScreen,
      },
    };

    return (renderCustomToolbar ?? defaultRenderCustomToolbar)(nextProps);
  };
};
