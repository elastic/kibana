/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { monaco } from '@kbn/monaco';
import type { LineColumnPosition } from '../../../entities/workflows/store';
import {
  openCreateConnectorFlyout,
  openEditConnectorFlyout,
} from '../../../entities/workflows/store';

// Hook to register hover command actions
export function useRegisterHoverCommands() {
  const hoverCommands = useRef<monaco.IDisposable[]>([]);
  const dispatch = useDispatch();

  const unregisterHoverCommands = useCallback(() => {
    hoverCommands.current.forEach((action) => action.dispose());
  }, []);

  const registerHoverCommands = useCallback(() => {
    unregisterHoverCommands();

    hoverCommands.current = [
      monaco.editor.registerCommand(
        'workflows.editor.action.createConnector',
        (_, args: { connectorType: string; insertPosition: LineColumnPosition }) => {
          const { connectorType, insertPosition } = args;
          dispatch(openCreateConnectorFlyout({ connectorType, insertPosition }));
        }
      ),
      monaco.editor.registerCommand(
        'workflows.editor.action.editConnector',
        (_, args: { connectorType: string; connectorId: string }) => {
          const { connectorType, connectorId } = args;
          dispatch(openEditConnectorFlyout({ connectorType, connectorIdToEdit: connectorId }));
        }
      ),
    ];
  }, [unregisterHoverCommands, dispatch]);

  return { registerHoverCommands, unregisterHoverCommands };
}

// Functions to get the hover command links
export const getCreateConnectorHoverCommandLink = ({
  text,
  connectorType,
  insertPosition,
}: {
  text: string;
  connectorType: string;
  insertPosition: LineColumnPosition;
}) => {
  const args = encodeURIComponent(JSON.stringify({ connectorType, insertPosition }));
  return `[${text}](command:workflows.editor.action.createConnector?${args})`;
};

export const getEditConnectorHoverCommandLink = ({
  text,
  connectorType,
  connectorId,
}: {
  text: string;
  connectorType: string;
  connectorId: string;
}) => {
  const args = encodeURIComponent(JSON.stringify({ connectorType, connectorId }));
  return `[${text}](command:workflows.editor.action.editConnector?${args})`;
};
