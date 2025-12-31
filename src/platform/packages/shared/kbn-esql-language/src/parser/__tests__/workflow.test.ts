/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import type { ESQLAstWorkflowCommand } from '../../types';

describe('WORKFLOW command', () => {
  describe('correctly formatted', () => {
    describe('WORKFLOW "<id>" WITH (inputs) ...', () => {
      it('parses the WORKFLOW command', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (message = field1)`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'workflow',
          incomplete: false,
        });
      });

      it('parses workflow ID as the first argument', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (message = field1)`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.workflowId).toMatchObject({
          type: 'literal',
          literalType: 'keyword',
          valueUnquoted: 'my-workflow-id',
        });
      });

      it('parses single input', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (message = field1)`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.inputs).toHaveLength(1);
        expect(workflowCommand.inputs[0].name).toBe('message');
      });

      it('parses multiple inputs', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (a = field1, b = field2, c = "literal")`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.inputs).toHaveLength(3);
        expect(workflowCommand.inputs[0].name).toBe('a');
        expect(workflowCommand.inputs[1].name).toBe('b');
        expect(workflowCommand.inputs[2].name).toBe('c');
      });

      it('parses input with string literal value', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (prompt = "Hello world")`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.inputs[0].value).toMatchObject({
          type: 'literal',
          literalType: 'keyword',
        });
      });

      it('parses input with column reference', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (data = my_field)`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.inputs[0].value).toMatchObject({
          type: 'column',
          name: 'my_field',
        });
      });

      it('parses input with function expression', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (combined = CONCAT(a, b))`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.inputs[0].value).toMatchObject({
          type: 'function',
          name: 'concat',
        });
      });
    });

    describe('WORKFLOW "<id>" WITH (inputs) AS targetField', () => {
      it('parses the target field', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (message = field1) AS result`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.targetField).toMatchObject({
          type: 'column',
          name: 'result',
        });
      });

      it('parses with custom target field name', () => {
        const text = `FROM index | WORKFLOW "my-workflow-id" WITH (x = 1) AS workflow_output`;
        const query = EsqlQuery.fromSrc(text);

        const workflowCommand = query.ast.commands[1] as ESQLAstWorkflowCommand;
        expect(workflowCommand.targetField).toMatchObject({
          type: 'column',
          name: 'workflow_output',
        });
      });
    });
  });

  describe('incorrectly formatted', () => {
    it('throws on missing workflow ID', () => {
      const text = `FROM index | WORKFLOW WITH (message = field1)`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('throws on missing WITH clause', () => {
      const text = `FROM index | WORKFLOW "my-workflow-id"`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('throws on missing inputs', () => {
      const text = `FROM index | WORKFLOW "my-workflow-id" WITH ()`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('throws on missing parentheses', () => {
      const text = `FROM index | WORKFLOW "my-workflow-id" WITH message = field1`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('throws on just the command keyword', () => {
      const text = `FROM index | WORKFLOW`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

