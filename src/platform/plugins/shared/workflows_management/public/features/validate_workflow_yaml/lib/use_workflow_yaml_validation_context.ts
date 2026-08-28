/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MutableRefObject, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import type {
  ConnectorTypesValidationState,
  WorkflowYamlValidationContext,
} from './collect_full_workflow_yaml_validation_results';
import { useGetPropertyHandler } from './property_handlers/use_get_property_handler';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import {
  selectConnectorsLoadState,
  selectWorkflows,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowEsqlCallbacks } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/use_workflow_esql_callbacks';

const getConnectorTypesValidationState = (
  connectorsData: ReturnType<typeof useAvailableConnectors>,
  connectorsLoadState: ReturnType<typeof selectConnectorsLoadState>
): ConnectorTypesValidationState => {
  if (connectorsLoadState.status === 'ready' && connectorsData) {
    return { status: 'ready', value: connectorsData.connectorTypes };
  }
  if (connectorsLoadState.status === 'failed') {
    return connectorsLoadState;
  }
  return { status: 'loading' };
};

/** Live Kibana context shared by the YAML editor and change-history preview validators. */
export function useWorkflowYamlValidationContext(): WorkflowYamlValidationContext {
  const connectorsData = useAvailableConnectors();
  const connectorsLoadState = useSelector(selectConnectorsLoadState);
  const workflows = useSelector(selectWorkflows);
  const { application, http, data, licensing } = useKibana().services;
  const esqlCallbacks = useWorkflowEsqlCallbacks({
    http,
    application,
    data,
    licensing,
  });
  const esqlCallbacksRef = useRef(esqlCallbacks);
  esqlCallbacksRef.current = esqlCallbacks;
  const getPropertyHandler = useGetPropertyHandler();

  return useMemo(
    () => ({
      connectorTypes: getConnectorTypesValidationState(connectorsData, connectorsLoadState),
      connectorsManagementUrl: application.getUrlForApp('management', {
        deepLinkId: 'triggersActionsConnectors',
        absolute: true,
      }),
      workflows,
      getPropertyHandler,
      esqlCallbacks: esqlCallbacksRef.current,
    }),
    [application, connectorsData, connectorsLoadState, getPropertyHandler, workflows]
  );
}

/** Returns an operational error when a validation prerequisite failed to load. */
export const getWorkflowYamlValidationContextError = (
  context: WorkflowYamlValidationContext
): Error | null =>
  context.connectorTypes.status === 'failed'
    ? new Error(
        i18n.translate('workflowsManagement.validation.connectorMetadataUnavailable', {
          defaultMessage: 'Validation unavailable: connectors failed to load',
        }),
        // The underlying reason is usually generic transport text ("Failed to fetch"), so it
        // stays off the accordion title and rides along here for logs and devtools.
        { cause: context.connectorTypes.error }
      )
    : null;

/** Ref wrapper for async validation paths that must read the latest context without effect churn. */
export function useWorkflowYamlValidationContextRef(): MutableRefObject<WorkflowYamlValidationContext> {
  const context = useWorkflowYamlValidationContext();
  const contextRef = useRef(context);
  contextRef.current = context;

  return contextRef;
}
