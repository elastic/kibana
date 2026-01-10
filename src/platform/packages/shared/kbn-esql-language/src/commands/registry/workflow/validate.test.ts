/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../../composer/query';
import type { ESQLAstWorkflowCommand } from '../../../types';
import { validate } from './validate';

describe('WORKFLOW command validation', () => {
  describe('valid commands', () => {
    it('should not produce workflow-specific errors for valid workflow command', () => {
      const text = `FROM index | WORKFLOW "my-workflow-id" WITH (message = field1)`;
      const query = EsqlQuery.fromSrc(text);
      const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;

      const messages = validate(workflowCommand, query.ast.commands);

      // Filter for workflow-specific errors (e.g., workflowIdRequired)
      const workflowErrors = messages.filter((m) => 
        m.type === 'error' && m.code === 'workflowIdRequired'
      );
      expect(workflowErrors).toHaveLength(0);
    });

    it('should not produce workflow-specific errors for workflow with target field', () => {
      const text = `FROM index | WORKFLOW "my-workflow-id" WITH (message = field1) AS result`;
      const query = EsqlQuery.fromSrc(text);
      const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;

      const messages = validate(workflowCommand, query.ast.commands);

      const workflowErrors = messages.filter((m) => 
        m.type === 'error' && m.code === 'workflowIdRequired'
      );
      expect(workflowErrors).toHaveLength(0);
    });

    it('should not produce workflow-specific errors for workflow with multiple inputs', () => {
      const text = `FROM index | WORKFLOW "my-workflow-id" WITH (a = 1, b = "text", c = field)`;
      const query = EsqlQuery.fromSrc(text);
      const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;

      const messages = validate(workflowCommand, query.ast.commands);

      const workflowErrors = messages.filter((m) => 
        m.type === 'error' && m.code === 'workflowIdRequired'
      );
      expect(workflowErrors).toHaveLength(0);
    });
  });
});
