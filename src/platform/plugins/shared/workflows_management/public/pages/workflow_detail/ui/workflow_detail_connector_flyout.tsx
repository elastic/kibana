/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useFetchConnector } from '../../../entities/connectors/model/use_available_connectors';
import type { MonacoInsertPosition } from '../../../entities/workflows/store';
import {
  closeConnectorFlyout,
  selectConnectorFlyoutConnectorToEdit,
  selectConnectorFlyoutInsertPosition,
  selectConnectorFlyoutType,
  selectIsConnectorFlyoutOpen,
} from '../../../entities/workflows/store';
import { useKibana } from '../../../hooks/use_kibana';

interface WorkflowDetailConnectorFlyoutProps {
  onConnectorsChanged: () => void;
}
export const WorkflowDetailConnectorFlyout = React.memo<WorkflowDetailConnectorFlyoutProps>(
  ({ onConnectorsChanged }) => {
    const { triggersActionsUi } = useKibana().services;
    const isOpen = useSelector(selectIsConnectorFlyoutOpen);
    const connectorType = useSelector(selectConnectorFlyoutType);
    const connectorIdToEdit = useSelector(selectConnectorFlyoutConnectorToEdit);
    const insertPosition = useSelector(selectConnectorFlyoutInsertPosition);
    const { data: connector, isLoading: isLoadingConnector } = useFetchConnector(connectorIdToEdit);
    const dispatch = useDispatch();

    const addConnectorFlyout = useMemo(() => {
      if (!isOpen || !connectorType) {
        return null;
      }

      if (connectorIdToEdit) {
        if (connector && !isLoadingConnector) {
          // Open the "edit connector" flyout
          return triggersActionsUi.getEditConnectorFlyout({
            connector,
            onClose: () => {
              dispatch(closeConnectorFlyout());
            },
            onConnectorUpdated: () => {
              onConnectorsChanged();
              dispatch(closeConnectorFlyout());
            },
          });
        }
      } else {
        // Open the "create connector" flyout
        return triggersActionsUi.getAddConnectorFlyout({
          initialConnector: { actionTypeId: connectorType },
          onClose: () => {
            dispatch(closeConnectorFlyout());
          },
          onConnectorCreated: (createdConnector: ActionConnector) => {
            if (insertPosition) {
              insertConnectorId(createdConnector.id, insertPosition);
            }
            onConnectorsChanged();
            dispatch(closeConnectorFlyout());
          },
        });
      }
    }, [
      triggersActionsUi,
      isOpen,
      dispatch,
      onConnectorsChanged,
      connectorType,
      connectorIdToEdit,
      connector,
      isLoadingConnector,
      insertPosition,
    ]);

    return addConnectorFlyout;
  }
);
WorkflowDetailConnectorFlyout.displayName = 'WorkflowDetailConnectorFlyout';

function insertConnectorId(id: string, insertPosition: MonacoInsertPosition) {
  // Find the YAML model (should be the workflow editor model)
  const models = monaco.editor.getModels();
  const yamlModel = models.find((model) => model.getLanguageId() === YAML_LANG_ID);

  if (yamlModel) {
    try {
      const position = new monaco.Position(insertPosition.lineNumber, insertPosition.column);

      // Try to get the word/value at this position to replace it entirely
      const wordAtPosition = yamlModel.getWordAtPosition(position);

      let replaceRange: monaco.Range;
      if (wordAtPosition) {
        // Replace the entire word/value
        replaceRange = new monaco.Range(
          insertPosition.lineNumber,
          wordAtPosition.startColumn,
          insertPosition.lineNumber,
          wordAtPosition.endColumn
        );
      } else {
        // If no word found, just insert at the position
        replaceRange = new monaco.Range(
          insertPosition.lineNumber,
          insertPosition.column,
          insertPosition.lineNumber,
          insertPosition.column
        );
      }

      yamlModel.pushEditOperations(null, [{ range: replaceRange, text: id }], () => null);
    } catch (error) {
      // Silently fail if insertion fails (e.g., model was disposed)
      // Error is ignored as this is a non-critical operation
    }
  }
}
