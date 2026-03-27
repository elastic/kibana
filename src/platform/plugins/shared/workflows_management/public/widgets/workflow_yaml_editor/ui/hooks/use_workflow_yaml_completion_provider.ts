/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { monaco } from '@kbn/monaco';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';
import { selectDetail } from '../../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../../hooks/use_kibana';
import { getCompletionItemProvider } from '../../lib/autocomplete/get_completion_item_provider';
import type { WorkflowKqlCompletionServices } from '../../lib/autocomplete/suggestions/workflow_kql_completion_services';

export const useWorkflowYamlCompletionProvider = (): monaco.languages.CompletionItemProvider => {
  const { services } = useKibana();
  const editorState = useSelector(selectDetail);
  const editorStateRef = useRef<WorkflowDetailState>(editorState);
  editorStateRef.current = editorState;

  const completionProvider = useMemo(() => {
    const getKqlServices = (): WorkflowKqlCompletionServices => ({
      kql: services.kql,
      fieldFormats: services.fieldFormats,
    });
    return getCompletionItemProvider(() => editorStateRef.current, getKqlServices);
  }, [services.fieldFormats, services.kql]);

  return completionProvider;
};
