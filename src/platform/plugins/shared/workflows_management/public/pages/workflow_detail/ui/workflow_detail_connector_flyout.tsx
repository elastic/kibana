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
import { monaco } from '@kbn/monaco';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useFetchConnector } from '../../../entities/connectors/model/use_available_connectors';
import type { LineColumnPosition } from '../../../entities/workflows/store';
import {
  closeConnectorFlyout,
  selectConnectorFlyoutConnectorToEdit,
  selectConnectorFlyoutInsertPosition,
  selectConnectorFlyoutType,
  selectIsConnectorFlyoutOpen,
} from '../../../entities/workflows/store';
import { loadConnectorsThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_connectors_thunk';
import { useAsyncThunk } from '../../../hooks/use_async_thunk';
import { useKibana } from '../../../hooks/use_kibana';

interface WorkflowDetailConnectorFlyoutProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

export const WorkflowDetailConnectorFlyout = React.memo(
  ({ editorRef }: WorkflowDetailConnectorFlyoutProps) => {
    const { triggersActionsUi } = useKibana().services;
    const loadConnectors = useAsyncThunk(loadConnectorsThunk);
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
              loadConnectors();
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
              insertConnectorId(createdConnector.id, insertPosition, editorRef.current);
            }
            loadConnectors();
            dispatch(closeConnectorFlyout());
          },
        });
      }
    }, [
      triggersActionsUi,
      isOpen,
      dispatch,
      loadConnectors,
      connectorType,
      connectorIdToEdit,
      connector,
      isLoadingConnector,
      insertPosition,
      editorRef,
    ]);

    return addConnectorFlyout;
  }
);
WorkflowDetailConnectorFlyout.displayName = 'WorkflowDetailConnectorFlyout';

function insertConnectorId(
  id: string,
  insertPosition: LineColumnPosition,
  editor: monaco.editor.IStandaloneCodeEditor | null
) {
  const model = editor?.getModel();
  if (model) {
    try {
      const { lineNumber, column } = insertPosition;
      const endColumn = model.getLineMaxColumn(lineNumber); // make sure to replace the entire line
      const replaceRange = new monaco.Range(lineNumber, column, lineNumber, endColumn);

      model.pushEditOperations(null, [{ range: replaceRange, text: id }], () => null);
    } catch (_) {
      // fallback to edit the yaml string
    }
  }
  // TODO: When the visual builder is implemented, dispatch an action to edit the yaml string to the store directly.
}
