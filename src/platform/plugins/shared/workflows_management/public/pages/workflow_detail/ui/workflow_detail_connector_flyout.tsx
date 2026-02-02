/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useFetchConnector } from '../../../entities/connectors/model/use_available_connectors';
import {
  closeConnectorFlyout,
  type LineColumnPosition,
  selectConnectorFlyoutConnectorToEdit,
  selectConnectorFlyoutInsertPosition,
  selectConnectorFlyoutType,
  selectIsConnectorFlyoutOpen,
  selectYamlString,
  setYamlString,
} from '../../../entities/workflows/store';
import { useKibana } from '../../../hooks/use_kibana';
import { insertTextAtPosition } from '../../../shared/utils/insert_text_at_position';

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
    const yamlString = useSelector(selectYamlString);
    const dispatch = useDispatch();

    const insertConnectorId = useCallback(
      (id: string, position: LineColumnPosition) => {
        const updatedYaml = insertTextAtPosition(yamlString, position, id);
        dispatch(setYamlString(updatedYaml));
      },
      [dispatch, yamlString]
    );

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
      insertConnectorId,
    ]);

    return addConnectorFlyout;
  }
);
WorkflowDetailConnectorFlyout.displayName = 'WorkflowDetailConnectorFlyout';
