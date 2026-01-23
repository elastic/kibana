/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { monaco } from '@kbn/monaco';
import type { MonacoInsertPosition } from '../../../../entities/workflows/store';
import {
  openCreateConnectorFlyout,
  openEditConnectorFlyout,
} from '../../../../entities/workflows/store';

export enum WorkflowAction {
  OpenConnectorFlyout = 'open-connector-flyout',
  OpenConnectorEditFlyout = 'open-connector-edit-flyout',
}

type WorkflowHoverClickAction =
  | {
      action: WorkflowAction.OpenConnectorFlyout;
      params: { connectorType: string };
    }
  | {
      action: WorkflowAction.OpenConnectorEditFlyout;
      params: { connectorType: string; connectorId: string };
    };

/**
 * Intercepts clicks on Monaco editor hover widget links that have data-workflow-action
 * attributes to dispatch Redux actions instead of navigating.
 */
export function useMonacoHoverClickInterceptor(
  editor: monaco.editor.IStandaloneCodeEditor | null
): void {
  const dispatch = useDispatch();
  const clickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    // Create click handler that intercepts clicks on elements with data-workflow-action attributes
    // Monaco hover widgets are rendered outside the editor container, so we attach to document
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) {
        return;
      }

      // Check if the click is within a Monaco hover widget
      const hoverContainer = target.closest('.monaco-hover, .monaco-editor-hover');
      if (!hoverContainer) {
        return;
      }

      // Check if the clicked element or its parent has the data-workflow-action attribute
      const actionElement = target.closest('[data-workflow-action]') as HTMLElement;
      if (!actionElement) {
        return;
      }

      const action = actionElement.getAttribute('data-workflow-action');
      if (!action) {
        return;
      }

      // Prevent default navigation
      event.preventDefault();
      event.stopPropagation();

      // Handle the open-connector-flyout action
      if (action === WorkflowAction.OpenConnectorFlyout) {
        const connectorType = actionElement.getAttribute('data-connector-type');
        if (connectorType) {
          // Get the current editor position to insert the connector ID later
          const position = editor.getPosition();
          const insertPosition: MonacoInsertPosition | undefined = position
            ? { lineNumber: position.lineNumber, column: position.column }
            : undefined;
          dispatch(
            openCreateConnectorFlyout({
              connectorType: decodeURIComponent(connectorType),
              insertPosition,
            })
          );
        }
      }
      if (action === WorkflowAction.OpenConnectorEditFlyout) {
        const connectorId = actionElement.getAttribute('data-connector-id');
        const connectorType = actionElement.getAttribute('data-connector-type');
        if (connectorId && connectorType) {
          dispatch(
            openEditConnectorFlyout({
              connectorType: decodeURIComponent(connectorType),
              connectorIdToEdit: decodeURIComponent(connectorId),
            })
          );
        }
      }
    };

    // Attach click handler to document to catch clicks on Monaco hover widgets
    document.addEventListener('click', handleClick, true); // Use capture phase to catch early
    clickHandlerRef.current = handleClick;

    return () => {
      if (clickHandlerRef.current) {
        document.removeEventListener('click', clickHandlerRef.current, true);
        clickHandlerRef.current = null;
      }
    };
  }, [editor, dispatch]);
}

// Use HTML with data attributes that we can intercept to dispatch Redux action
// Monaco supports HTML in markdown when supportHtml: true is set
export const createHoverClickActionLink = ({
  action,
  params,
  text,
}: WorkflowHoverClickAction & { text: string }): string => {
  const link = document.createElement('a');
  link.href = '#';
  link.setAttribute('data-workflow-action', action);
  link.setAttribute('style', 'color: #006BB4; text-decoration: underline; cursor: pointer;');

  if (action === WorkflowAction.OpenConnectorFlyout) {
    link.setAttribute('data-connector-type', encodeURIComponent(params.connectorType));
  }
  if (action === WorkflowAction.OpenConnectorEditFlyout) {
    link.setAttribute('data-connector-type', encodeURIComponent(params.connectorType));
    link.setAttribute('data-connector-id', encodeURIComponent(params.connectorId));
  }
  link.textContent = text;
  return link.outerHTML;
};
