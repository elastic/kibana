/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { ESQLAstCompletionCommand, ESQLCommandOption } from '../../types';

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

        expect(query.ast.commands[1].args[0]).toMatchObject([
          {
            type: 'literal',
            literalType: 'param',
            paramType: 'unnamed',
          },
        ]);
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

    describe('... AS <targetField>', () => {
      it('parses the AS command option as the third argument', () => {
        const text = `FROM index | COMPLETION prompt WITH inferenceId AS targetField`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1].args[2]).toMatchObject({
          type: 'option',
          name: 'as',
        });
      });

      it('parses targetField as AS option argument', () => {
        const text = `FROM index | COMPLETION prompt WITH inferenceId AS targetField`;
        const query = EsqlQuery.fromSrc(text);

        const asOption = query.ast.commands[1].args[2] as ESQLCommandOption;

        expect(asOption).toMatchObject({
          args: [
            {
              type: 'column',
              name: 'targetField',
            },
          ],
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
