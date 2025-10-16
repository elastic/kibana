/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { WorkflowYaml } from '@kbn/workflows';
import { FormattedMessage } from '@kbn/i18n-react';
import { WorkflowVisualEditor } from './workflow_visual_editor';
import {
  getCachedDynamicConnectorTypes,
  getWorkflowZodSchemaLoose,
} from '../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';

interface WorkflowVisualEditorStatefulProps {
  workflowYaml: string;
  workflowExecutionId?: string;
}

export function WorkflowVisualEditorStateful({
  workflowYaml,
  workflowExecutionId,
}: WorkflowVisualEditorStatefulProps) {
  const { data: workflowExecution } = useWorkflowExecution(workflowExecutionId ?? null);

  const workflowYamlObject = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    const dynamicConnectorTypes = getCachedDynamicConnectorTypes() || {};
    const result = parseWorkflowYamlToJSON(
      workflowYaml,
      getWorkflowZodSchemaLoose(dynamicConnectorTypes)
    );
    if (result.error) {
      return null;
    }
    return result.data;
  }, [workflowYaml]);

  if (!workflowYamlObject) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="workflows.visualEditor.invalidWorkflowYaml"
              defaultMessage="Invalid workflow YAML"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="workflows.visualEditor.invalidWorkflowYamlBody"
            defaultMessage="The workflow YAML is invalid. Please check the YAML and try again."
          />
        }
      />
    );
  }

  return (
    <WorkflowVisualEditor
      workflow={workflowYamlObject as WorkflowYaml}
      stepExecutions={workflowExecution?.stepExecutions}
    />
  );
}
