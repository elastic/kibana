/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useWorkflowYamlZodSchema } from '../../../features/workflow_yaml_schema';
import type { WorkflowYAMLEditorProps } from './workflow_yaml_editor';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';

export function WorkflowYAMLEditorWithSchema(
  props: Omit<WorkflowYAMLEditorProps, 'workflowYamlZodSchemaStrict' | 'workflowYamlZodSchemaLoose'>
) {
  const workflowYamlZodSchemaStrict = useWorkflowYamlZodSchema({ loose: false });
  const workflowYamlZodSchemaLoose = useWorkflowYamlZodSchema({ loose: true });

  if (!workflowYamlZodSchemaStrict || !workflowYamlZodSchemaLoose) {
    return <EuiLoadingSpinner />;
  }

  return (
    <WorkflowYAMLEditor
      {...props}
      workflowYamlZodSchemaStrict={workflowYamlZodSchemaStrict}
      workflowYamlZodSchemaLoose={workflowYamlZodSchemaLoose}
    />
  );
}
