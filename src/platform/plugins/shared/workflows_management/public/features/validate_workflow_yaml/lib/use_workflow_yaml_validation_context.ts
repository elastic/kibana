/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MutableRefObject, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { WorkflowYamlValidationContext } from './collect_full_workflow_yaml_validation_results';
import { useGetPropertyHandler } from './property_handlers/use_get_property_handler';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { selectWorkflows } from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowEsqlCallbacks } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/use_workflow_esql_callbacks';

/** Live Kibana context shared by the YAML editor and change-history preview validators. */
export function useWorkflowYamlValidationContext(): WorkflowYamlValidationContext {
  const connectorsData = useAvailableConnectors();
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
      connectorTypes: connectorsData?.connectorTypes ?? null,
      connectorsManagementUrl: application.getUrlForApp('management', {
        deepLinkId: 'triggersActionsConnectors',
        absolute: true,
      }),
      workflows,
      getPropertyHandler,
      esqlCallbacks: esqlCallbacksRef.current,
    }),
    [application, connectorsData?.connectorTypes, getPropertyHandler, workflows]
  );
}

/** Ref wrapper for async validation paths that must read the latest context without effect churn. */
export function useWorkflowYamlValidationContextRef(): MutableRefObject<WorkflowYamlValidationContext> {
  const context = useWorkflowYamlValidationContext();
  const contextRef = useRef(context);
  contextRef.current = context;

  return contextRef;
}
