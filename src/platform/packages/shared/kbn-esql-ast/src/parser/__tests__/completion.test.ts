/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import {
  ESQLAstCompletionCommand,
  ESQLAstItem,
  ESQLCommandOption,
  ESQLFunction,
} from '../../types';

describe('COMPLETION command', () => {
  describe('correctly formatted', () => {
    describe('COMPLETION <prompt> WITH <inferenceId> ...', () => {
      it('parses the COMPLETION command', () => {
        const text = `FROM index | COMPLETION prompt WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'completion',
          incomplete: false,
        });
      });

      it('parses prompt primary expression as the first argument', () => {
        const text = `FROM index | COMPLETION prompt WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1].args[0]).toMatchObject({
          type: 'column',
          name: 'prompt',
        });
      });

      it('parses prompt when it is a param', () => {
        const text = `FROM index | COMPLETION ? WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        const promptArg = query.ast.commands[1].args[0] as ESQLAstItem[];

        expect(promptArg[0]).toMatchObject({
          type: 'literal',
          literalType: 'param',
          paramType: 'unnamed',
        });
      });

      it('parses the WITH command option as the second argument', () => {
        const text = `FROM index | COMPLETION prompt WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1].args[1]).toMatchObject({
          type: 'option',
          name: 'with',
        });
      });

      it('parses inferenceId as the argument of the WITH option', () => {
        const text = `FROM index | COMPLETION prompt WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        const withOption = query.ast.commands[1].args[1] as ESQLCommandOption;

        expect(withOption).toMatchObject({
          args: [
            {
              type: 'identifier',
              name: 'inferenceId',
            },
          ],
        });
      });

      it('parses backtick inferenceId', () => {
        const text = `FROM index | COMPLETION prompt WITH \`inferenceId\``;
        const query = EsqlQuery.fromSrc(text);

        const withOption = query.ast.commands[1].args[1] as ESQLCommandOption;

        expect(query.errors.length).toBe(0);
        expect(withOption).toMatchObject({
          args: [
            {
              type: 'identifier',
              name: 'inferenceId',
            },
          ],
        });
      });

      it('parses inferenceId when it is param', () => {
        const text = `FROM index | COMPLETION prompt WITH ?`;
        const query = EsqlQuery.fromSrc(text);

        const withOption = query.ast.commands[1].args[1] as ESQLCommandOption;

        expect(query.errors.length).toBe(0);
        expect(withOption).toMatchObject({
          args: [
            {
              type: 'literal',
              literalType: 'param',
              paramType: 'unnamed',
            },
          ],
        });
      });
    });

    describe('COMPLETION <targetField> = <prompt> WITH <inferenceId>', () => {
      it('parses the assignment as the first argument of COMPLETION', () => {
        const text = `FROM index | COMPLETION targetField = "prompt" WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);
        expect(query.ast.commands[1].args[0]).toMatchObject({
          type: 'function',
          name: '=',
        });
      });

      it('parses the targetField as the first argument of the assignment', () => {
        const text = `FROM index | COMPLETION targetField1 = "prompt" WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        const completionCommand = query.ast.commands[1] as ESQLAstCompletionCommand;

        const assignment = completionCommand.args[0] as ESQLFunction;
        expect(assignment.args[0]).toMatchObject({
          type: 'column',
          name: 'targetField1',
        });

        expect(completionCommand.targetField).toMatchObject({
          type: 'column',
          name: 'targetField1',
        });
      });

      it('parses the prompt as the second argument of the assignment', () => {
        const text = `FROM index | COMPLETION targetField = "prompt" WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        const completionCommand = query.ast.commands[1] as ESQLAstCompletionCommand;

        const assignment = completionCommand.args[0] as ESQLFunction;
        expect(assignment.args[1]).toMatchObject({
          type: 'literal',
          literalType: 'keyword',
          value: '"prompt"',
        });

        expect(completionCommand.prompt).toMatchObject({
          type: 'literal',
          literalType: 'keyword',
          value: '"prompt"',
        });
      });

      it('parses the WITH command option as the second argument', () => {
        const text = `FROM index | COMPLETION targetField = "prompt" WITH inferenceId`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1].args[1]).toMatchObject({
          type: 'option',
          name: 'with',
        });
      });
    });
  });

  describe('incorrectly formatted', () => {
    it('throws on missing prompt', () => {
      const text = `FROM index | COMPLETION`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    it('throws on missing prompt with options', () => {
      const text = `FROM index | COMPLETION WITH inferenceId`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length > 0).toBe(true);
    });

    it('throws on missing WITH option', () => {
      const text = `FROM index | COMPLETION prompt`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    it('throws on missing WITH argument', () => {
      const text = `FROM index | COMPLETION prompt WITH`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    test('just the command keyword', () => {
      const text = `FROM index | COMPLETION`;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      expect(errors.length).toBe(1);

      expect(ast.commands).toHaveLength(2);

      const completionCommand = ast.commands[1] as ESQLAstCompletionCommand;
      expect(completionCommand.args[0]).toMatchObject({
        name: 'unknown',
        type: 'unknown',
        incomplete: true,
      });
    });

    test('just the command keyword and a prompt', () => {
      const text = `FROM index | COMPLETION "prompt"`;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      expect(errors.length).toBe(1);

      expect(ast.commands).toHaveLength(2);

      const completionCommand = ast.commands[1] as ESQLAstCompletionCommand;
      expect(completionCommand.args).toHaveLength(2);

      expect(completionCommand.args[1]).toMatchObject({
        type: 'option',
        name: 'with',
        incomplete: true,
      });

      expect(completionCommand.prompt).toMatchObject({
        type: 'literal',
        literalType: 'keyword',
        value: '"prompt"',
      });
    });

    test('just the new column assignment', () => {
      const text = `FROM index | COMPLETION targetField = `;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      expect(errors.length).toBe(1);

      expect(ast.commands).toHaveLength(2);

      const completionCommand = ast.commands[1] as ESQLAstCompletionCommand;
      expect(completionCommand.args).toHaveLength(2);

      expect(completionCommand.args[1]).toMatchObject({
        type: 'option',
        name: 'with',
        incomplete: true,
      });

      expect(completionCommand.targetField).toMatchObject({
        type: 'column',
        name: 'targetField',
      });
    });

    it('uses an unknown node if the command is ambiguous, its not clear if the user is using a column as a prompt or trying to define a new one ', () => {
      const text = `FROM index | COMPLETION columnName`;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      expect(errors.length).toBe(1);

      expect(ast.commands).toHaveLength(2);

      const completionCommand = ast.commands[1] as ESQLAstCompletionCommand;
      expect(completionCommand.args).toHaveLength(2);

      expect(completionCommand.args[1]).toMatchObject({
        type: 'option',
        name: 'with',
        incomplete: true,
      });

      expect(completionCommand.prompt).toMatchObject({
        type: 'unknown',
        name: 'unknown',
      });
    });

    it('sets incomplete flag on WITH argument if not inferenceId provided', () => {
      const text = `FROM index | COMPLETION prompt WITH `;
      const { ast } = EsqlQuery.fromSrc(text);

      expect(ast.commands[1].args[1]).toMatchObject({
        type: 'option',
        name: 'with',
        incomplete: true,
      });
    });

    it('marks WITH option as incomplete if not fully typed', () => {
      const text = `FROM index | COMPLETION prompt WIT`;
      const { ast } = EsqlQuery.fromSrc(text);

      const completionCommand = ast.commands[1] as ESQLAstCompletionCommand;
      expect(completionCommand.args).toHaveLength(2);
      expect(completionCommand.args[1]).toMatchObject({
        type: 'option',
        name: 'with',
        incomplete: true,
      });

      expect(completionCommand.inferenceId).toMatchObject({
        type: 'identifier',
        name: '',
        incomplete: true,
      });
    });

    it('throws on inferenceId wrapped in double quotes', () => {
      const text = `FROM index | COMPLETION prompt WITH "inferenceId"`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    it('throws on missing WITH argument with AS argument', () => {
      const text = `FROM index | COMPLETION prompt WITH AS targetField`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    it('throws on missing AS argument', () => {
      const text = `FROM index | COMPLETION prompt WITH inferenceId AS`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    it('throws on extra unsupported argument', () => {
      const text = `FROM index | COMPLETION prompt WITH inferenceId AS target WHEN`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });

    it('throws on unsupported argument after prompt', () => {
      const text = `FROM index | COMPLETION prompt AS target`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBe(1);
    });
  });
});
