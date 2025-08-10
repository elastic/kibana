/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';

const WorkflowYAMLEditor = React.lazy(() =>
  import('../../../widgets/workflow_yaml_editor/ui').then((module) => ({
    default: module.WorkflowYAMLEditor,
  }))
);

interface WorkflowEditorProps {
  workflowId: string;
  value: string;
  onChange: (v: string) => void;
  hasChanges: boolean;
}

export function WorkflowEditor({ workflowId, value, onChange, hasChanges }: WorkflowEditorProps) {
  useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      css={{
        border: '1px solid lightgray',
        borderRadius: '4px',
        height: 'calc(100vh - 300px)',
      }}
      gutterSize="none"
    >
      <EuiFlexItem grow={false}>
        {hasChanges ? (
          <div
            css={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              borderBottom: '1px solid lightgray',
            }}
          >
            <div
              style={{
                backgroundColor: 'darkorange',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
              }}
            />
            <span>Unsaved changes</span>
          </div>
        ) : (
          <div
            css={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              borderBottom: '1px solid lightgray',
            }}
          >
            <div
              style={{
                backgroundColor: 'green',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
              }}
            />
            <span>Saved</span>
          </div>
        )}
      </EuiFlexItem>
      <EuiFlexItem css={{ flex: 1, minHeight: 0, height: '100%' }}>
        <React.Suspense fallback={<EuiLoadingSpinner />}>
          <WorkflowYAMLEditor
            workflowId={workflowId}
            filename={`${workflowId}.yaml`}
            value={value}
            onChange={(v) => onChange(v ?? '')}
          />
        </React.Suspense>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
