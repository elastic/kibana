/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux-v7';
import type { monaco } from '@kbn/monaco';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';
import { selectDetail } from '../../../../entities/workflows/store/workflow_detail/selectors';
import { useGetPropertyHandler } from '../../../../features/validate_workflow_yaml/lib/property_handlers/use_get_property_handler';
import { useKibana } from '../../../../hooks/use_kibana';
import { getCompletionItemProvider } from '../../lib/autocomplete/get_completion_item_provider';
import type { WorkflowEsqlCompletionServices } from '../../lib/autocomplete/suggestions/workflow_esql_completion_services';
import type { WorkflowKqlCompletionServices } from '../../lib/autocomplete/suggestions/workflow_kql_completion_services';
import { useWorkflowEsqlCallbacks } from '../../lib/esql_validation/use_workflow_esql_callbacks';

export const useWorkflowYamlCompletionProvider = (): monaco.languages.CompletionItemProvider => {
  const { services } = useKibana();
  const getPropertyHandler = useGetPropertyHandler();
  const editorState = useSelector(selectDetail);
  const editorStateRef = useRef<WorkflowDetailState>(editorState);
  editorStateRef.current = editorState;

  // Independent from the validator's instance — completion and validation
  // each subscribe to the licensing/sources callbacks separately. Kept in a
  // ref so the memoized completion provider doesn't need to rebuild every
  // time the upstream services memo recomputes.
  const esqlCallbacks = useWorkflowEsqlCallbacks({
    http: services.http,
    application: services.application,
    data: services.data,
    licensing: services.licensing,
  });
  const esqlCallbacksRef = useRef(esqlCallbacks);
  esqlCallbacksRef.current = esqlCallbacks;

  const completionProvider = useMemo(() => {
    const getKqlServices = (): WorkflowKqlCompletionServices => ({
      kql: services.kql,
      fieldFormats: services.fieldFormats,
    });
    const getEsqlServices = (): WorkflowEsqlCompletionServices => ({
      callbacks: esqlCallbacksRef.current,
    });
    return getCompletionItemProvider(
      () => editorStateRef.current,
      getKqlServices,
      getPropertyHandler,
      getEsqlServices
    );
  }, [getPropertyHandler, services.fieldFormats, services.kql]);

  return completionProvider;
};
