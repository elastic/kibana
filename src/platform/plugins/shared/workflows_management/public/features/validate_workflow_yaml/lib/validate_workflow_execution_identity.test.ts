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

describe.each(['workflow.execute', 'workflow.executeAsync'])(
  '%s identity validation',
  (stepType) => {
    const validate = (fields: string[], isManaged: boolean) => {
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
        lineCounter,
        isManaged
      );
    };

    it.each(['inherit', 'override'])('rejects an unmanaged parent using %s', (mode) => {
      const results = validate(['workflow-id: managed', `run-as-mode: ${mode}`], false);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        message: 'Service account inheritance is only available to managed workflows.',
        startLineNumber: 11,
      });
    });

    it.each([[], ['run-as-mode: default']])(
      'allows default execution for unmanaged parents (%j)',
      (...fields) => {
        expect(validate(['workflow-id: ordinary', ...fields], false)).toEqual([]);
      }
    );

    it.each(['inherit', 'override'])(
      'leaves managed workflow child eligibility to the engine (%s)',
      (mode) => {
        expect(validate(['workflow-id: managed', `run-as-mode: ${mode}`], true)).toEqual([]);
      }
    );

    it('does not treat a child input as an identity option', () => {
      expect(
        validate(['workflow-id: ordinary', 'inputs:', '  run-as-mode: inherit'], false)
      ).toEqual([]);
    });
  }
);
