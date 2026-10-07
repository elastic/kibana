/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { buildWorkflowLookup } from '@kbn/workflows-yaml';
import { validateWorkflowExecutionIdentity } from './validate_workflow_execution_identity';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';

const workflows: WorkflowsResponse = {
  totalWorkflows: 2,
  workflows: {
    managed: { id: 'managed', name: 'Managed', managed: true },
    ordinary: { id: 'ordinary', name: 'Ordinary' },
  },
};

describe.each(['workflow.execute', 'workflow.executeAsync'])(
  '%s identity validation',
  (stepType) => {
    const validate = (fields: string[], children: WorkflowsResponse | null = workflows) => {
      const yaml = [
        'name: parent',
        'steps:',
        '  - name: loop',
        '    type: foreach',
        '    foreach: "{{ inputs.items }}"',
        '    steps:',
        '      - name: child',
        `        type: ${stepType}`,
        '        with:',
        ...fields.map((field) => `          ${field}`),
      ].join('\n');
      const lineCounter = new LineCounter();
      const document = parseDocument(yaml, { lineCounter });
      return validateWorkflowExecutionIdentity(
        buildWorkflowLookup(document, lineCounter),
        children,
        lineCounter
      );
    };

    it.each(['runAsMode: inherit', 'runAsMode: override'])(
      'rejects an unmanaged target with %s',
      (option) => {
        const results = validate(['workflow-id: ordinary', option]);
        expect(results).toHaveLength(1);
        expect(results[0].message).toContain('Only managed');
      }
    );

    it('rejects an expression for the child ID', () => {
      const results = validate(['workflow-id: "{{ inputs.child }}"', 'runAsMode: inherit']);
      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('literal workflow-id');
    });

    it.each(['runAsMode: default'])('preserves ordinary execution with %s', (option) => {
      expect(validate(['workflow-id: ordinary', option])).toEqual([]);
    });

    it('accepts a managed child and leaves input names alone', () => {
      expect(
        validate(['workflow-id: managed', 'runAsMode: inherit', 'inputs:', '  runAsMode: default'])
      ).toEqual([]);
    });

    it('does not misclassify a child that is missing from the lookup', () => {
      expect(validate(['workflow-id: missing', 'runAsMode: inherit'])).toEqual([]);
    });
  }
);
