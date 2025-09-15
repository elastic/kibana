/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { Walker } from '../../walker';

/**
 * @todo Tests skipped, while RERANK command grammar is being stabilized. We will
 * get back to it after 9.1 release.
 */
describe.skip('RERANK command', () => {
  describe('correctly formatted', () => {
    it('can parse the command', () => {
      const text = `FROM index | RERANK "query text" ON title, description`;
      const query = EsqlQuery.fromSrc(text);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
      });
    });

    it('can parse the command with inference id', () => {
      const text = `FROM index | RERANK "query text" ON title, description WITH \`reranker-inference-id\``;
      const query = EsqlQuery.fromSrc(text);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
      });
    });

    it('fills in command "args" array', () => {
      const text = `FROM index | RERANK "query text" ON title, description WITH \`reranker-inference-id\``;
      const query = EsqlQuery.fromSrc(text);

      expect(query.errors.length).toBe(0);
      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
        args: [
          {
            type: 'literal',
            literalType: 'keyword',
            valueUnquoted: 'query text',
          },
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: 'title',
                args: [{ type: 'identifier', name: 'title' }],
              },
              {
                type: 'column',
                name: 'description',
                args: [{ type: 'identifier', name: 'description' }],
              },
            ],
          },
          {
            type: 'option',
            name: 'with',
            args: [
              {
                type: 'identifier',
                name: 'reranker-inference-id',
              },
            ],
          },
        ],
      });
    });

    it('correctly parses locations', () => {
      const text = `FROM index | RERANK "query text" ON title, description WITH \`reranker-inference-id\``;
      const query = EsqlQuery.fromSrc(text);

      const command = Walker.match(query.ast, { type: 'command', name: 'rerank' })!;
      expect(text.slice(command.location!.min, command.location!.max + 1)).toBe(
        'RERANK "query text" ON title, description WITH `reranker-inference-id`'
      );

      const optionOn = Walker.match(query.ast, { type: 'option', name: 'on' })!;
      expect(text.slice(optionOn.location!.min, optionOn.location!.max + 1)).toBe(
        'ON title, description'
      );

      const title = Walker.match(query.ast, { type: 'identifier', name: 'title' })!;
      expect(text.slice(title.location!.min, title.location!.max + 1)).toBe('title');

      const description = Walker.match(query.ast, { type: 'identifier', name: 'description' })!;
      expect(text.slice(description.location!.min, description.location!.max + 1)).toBe(
        'description'
      );

      const optionWith = Walker.match(query.ast, { type: 'option', name: 'with' })!;
      expect(text.slice(optionWith.location!.min, optionWith.location!.max + 1)).toBe(
        'WITH `reranker-inference-id`'
      );

      const id = Walker.match(query.ast, { type: 'identifier', name: 'reranker-inference-id' })!;
      expect(text.slice(id.location!.min, id.location!.max + 1)).toBe('`reranker-inference-id`');
    });

    describe('can parse RERANK <query>', () => {
      it('single quoted query', () => {
        const text = `FROM index | RERANK "query text" ON title, description WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          query: {
            type: 'literal',
            literalType: 'keyword',
            valueUnquoted: 'query text',
          },
        });
      });

      it('triple quoted query', () => {
        const text = `FROM index | RERANK """query text""" ON title, description WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          query: {
            type: 'literal',
            literalType: 'keyword',
            valueUnquoted: 'query text',
          },
        });
      });

      it('query can be param', () => {
        const text = `FROM index | RERANK ?param ON title, description WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          query: {
            type: 'literal',
            literalType: 'param',
            value: 'param',
          },
        });
      });
    });

    describe('can parse RERANK ... ON <fields>', () => {
      it('a single field', () => {
        const text = `FROM index | RERANK "query text" ON title WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          fields: [
            {
              type: 'column',
              name: 'title',
              args: [{ type: 'identifier', name: 'title' }],
            },
          ],
        });
      });

      it('two fields', () => {
        const text = `FROM index | RERANK "query text" ON title, description WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          fields: [
            {
              type: 'column',
              name: 'title',
              args: [{ type: 'identifier', name: 'title' }],
            },
            {
              type: 'column',
              name: 'description',
              args: [{ type: 'identifier', name: 'description' }],
            },
          ],
        });
      });

      it('cannot be functions without assignments', () => {
        const text = `FROM index | RERANK "query text" ON AVG(123) WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length > 0).toBe(true);
      });

      it('can be assignments', () => {
        const text = `FROM index | RERANK "query text" ON foo = AVG(123) WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          fields: [{ type: 'function', name: '=' }],
        });
      });

      it('can be param', () => {
        const text = `FROM index | RERANK "query text" ON a = ?123 WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          fields: [
            {
              type: 'function',
              name: '=',
              args: [
                {},
                {
                  type: 'literal',
                  literalType: 'param',
                  paramType: 'positional',
                  value: 123,
                },
              ],
            },
          ],
        });
      });
    });

    describe('can parse RERANK ... WITH <inferenceId>', () => {
      it('backtick quoted ID', () => {
        const text = `FROM index | RERANK "query text" ON title, description WITH \`reranker-inference-id\``;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          inferenceId: {
            type: 'identifier',
            name: 'reranker-inference-id',
          },
        });
      });

      it('unquoted ID', () => {
        const text = `FROM index | RERANK "query text" ON title, description WITH the_id`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          inferenceId: {
            type: 'identifier',
            name: 'the_id',
          },
        });
      });

      it('as param', () => {
        const text = `FROM index | RERANK "query text" ON title, description WITH ?`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.errors.length).toBe(0);
        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'rerank',
          inferenceId: {
            type: 'literal',
            literalType: 'param',
            paramType: 'unnamed',
          },
        });
      });
    });
  });

  describe('incorrectly formatted', () => {
    const assertError = (text: string) => {
      const query = EsqlQuery.fromSrc(text);
      const command = query.ast.commands[1];

      expect(query.errors.length > 0).toBe(true);
      expect(command).toMatchObject({
        type: 'command',
        name: 'rerank',
        incomplete: true,
      });
    };

    it('errors on missing ON clause', () => {
      assertError(`FROM index | RERANK "query text" ON  WITH asdf`);
      assertError(`FROM index | RERANK "query text" ON WITH asdf`);
      assertError(`FROM index | RERANK "query text" WITH asdf`);
    });

    it('errors on missing query', () => {
      assertError(`FROM index | RERANK  ON asdf WITH asdf`);
      assertError(`FROM index | RERANK ON asdf WITH asdf`);
    });
  });
});
