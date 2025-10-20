/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { WorkflowYaml } from '@kbn/workflows';
import { useDispatch, useSelector } from 'react-redux';
import { setIsTestModalOpen } from '../../../widgets/workflow_yaml_editor/lib/store/slice';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { WorkflowExecuteModal } from '../../../features/run_workflow/ui/workflow_execute_modal';
import {
  getCachedDynamicConnectorTypes,
  getWorkflowZodSchemaLoose,
} from '../../../../common/schema';
import {
  selectIsTestModalOpen,
  selectYamlString,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';
import { useTestWorkflow } from '../../../widgets/workflow_yaml_editor/lib/store/hooks/use_test_workflow';

export const WorkflowDetailTestModal = () => {
  const dispatch = useDispatch();
  const isTestModalOpen = useSelector(selectIsTestModalOpen);
  const workflowYaml = useSelector(selectYamlString);

  const { testWorkflow } = useTestWorkflow();

  const handleRunWorkflow = useCallback(
    (inputs: Record<string, any>) => {
      testWorkflow(inputs);
    },
    [testWorkflow]
  );

  const onClose = useCallback(() => {
    dispatch(setIsTestModalOpen({ isTestModalOpen: false }));
  }, [dispatch]);

  const definitionFromCurrentYaml: WorkflowYaml | null = useMemo(() => {
    const dynamicConnectorTypes = getCachedDynamicConnectorTypes() || {};
    const parsingResult = parseWorkflowYamlToJSON(
      workflowYaml,
      getWorkflowZodSchemaLoose(dynamicConnectorTypes)
    );

    if (!parsingResult.success) {
      return null;
    }
    return parsingResult.data as WorkflowYaml;
  }, [workflowYaml]);

  if (!isTestModalOpen || !definitionFromCurrentYaml) {
    return null;
  }

  return (
    <WorkflowExecuteModal
      definition={definitionFromCurrentYaml}
      onClose={onClose}
      onSubmit={handleRunWorkflow}
    />
  );
};
