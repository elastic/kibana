/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

interface WorkflowEditorProps {
  value: string;
  onChange: (value: string) => void;
  hasChanges: boolean;
}

export function WorkflowEditor({ value, onChange, hasChanges }: WorkflowEditorProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      css={{
        border: '1px solid lightgray',
        borderRadius: '4px',
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
      <EuiFlexItem>
        <CodeEditor
          languageId="json"
          value={value}
          height={800}
          onChange={onChange}
          suggestionProvider={undefined}
          dataTestSubj={'workflow-json-editor'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
