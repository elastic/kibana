/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';

/** Z-index for portaled UI (KQL suggestions, etc.) above this modal without lowering the overlay stack. */
export const getWorkflowExecuteModalAboveModalZIndex = (euiTheme: EuiThemeComputed): number =>
  Math.max(Number(euiTheme.levels.toast), Number(euiTheme.levels.modal)) + 1;

/** Modal modifier when Alert, Document, or Event table is expanded via the toolbar fullscreen control. */
export const WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS =
  'workflowExecuteModal--tableGridFullScreen';

/** Flex root for run-workflow table tabs (Alert, Document, Event). */
export const WORKFLOW_EXECUTE_TABLE_TAB_ROOT_CLASS = 'workflowExecuteTableTabRoot';

/**
 * Global styles for the run/test workflow modal overlay and table-grid fullscreen.
 *
 * KQL suggestions render in an {@link EuiPortal} with a hardcoded z-index (~4001), below EUI's
 * modal layer. We raise only that portaled container while the modal is open — we do not lower
 * `.euiOverlayMask` z-index. Query bar overflow is handled on {@link EuiModalBody} in the modal.
 */
export const getWorkflowExecuteModalGlobalStyles = (
  euiTheme: EuiThemeComputed
): SerializedStyles => {
  const aboveModalZIndex = getWorkflowExecuteModalAboveModalZIndex(euiTheme);

  return css`
    body:has(.workflowExecuteModal) div:has(> .kbnTypeahead) {
      z-index: ${aboveModalZIndex} !important;
    }

    .euiOverlayMask:has(.${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS}) {
      padding: 0 !important;
      align-items: stretch !important;
    }

    .euiOverlayMask:has(.${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS})
      .workflowExecuteModal {
      width: 100vw !important;
      max-width: none !important;
      height: 100dvh !important;
      max-block-size: 100dvh !important;
      min-block-size: 100dvh !important;
      margin: 0 !important;
      border-radius: 0 !important;
    }

    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS} .euiModalBody,
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS} .euiModalBody__overflow,
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS}
      [data-test-subj='workflowExecuteModalBodyContent'],
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS} .euiModalBody__overflow > .euiFlexGroup {
      overflow: visible !important;
      flex: 1;
      min-height: 0;
    }

    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS} .workflowTriggerEventsRoot,
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS} .unifiedDataTable__inner,
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS} .unifiedDataTable__table,
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS}
      [data-test-subj='workflowExecuteModalBodyContent'],
    .${WORKFLOW_EXECUTE_MODAL_TABLE_GRID_FULLSCREEN_CLASS}
      .${WORKFLOW_EXECUTE_TABLE_TAB_ROOT_CLASS} {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
  `;
};
