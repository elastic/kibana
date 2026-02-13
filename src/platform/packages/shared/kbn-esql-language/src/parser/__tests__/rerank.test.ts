/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import type { ESQLAstRerankCommand, ESQLCommandOption } from '../../types';

describe('RERANK', () => {
  describe('basic parsing', () => {
    it('should parse basic RERANK query without target field assignment', () => {
      const text = 'FROM movies | RERANK "star wars" ON title WITH { "inference_id" : "reranker" }';
      const { ast } = EsqlQuery.fromSrc(text);

      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
        query: {
          type: 'literal',
          literalType: 'keyword',
          value: '"star wars"',
        },
        fields: [
          {
            type: 'column',
            name: 'title',
          },
        ],
        args: expect.arrayContaining([
          expect.objectContaining({
            type: 'literal',
            value: '"star wars"',
          }),
        ]),
      });

      expect(ast.commands[1]).not.toHaveProperty('targetField');
    });

    it('should parse ON clause as an option in the AST', () => {
      const text = 'FROM movies | RERANK "star wars" ON title WITH { "inference_id" : "reranker" }';
      const { ast } = EsqlQuery.fromSrc(text);
      const rerankCmd = ast.commands[1] as ESQLAstRerankCommand;

      const onOption = rerankCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'on'
      );

      expect(onOption).toBeDefined();
      expect(onOption).toMatchObject({
        type: 'option',
        name: 'on',
        args: [
          {
            type: 'column',
            name: 'title',
          },
        ],
      });
    });

    it('should parse RERANK with multiple fields', () => {
      const text =
        'FROM movies | RERANK "star wars" ON title, description, actors WITH { "inference_id" : "reranker" }';
      const { ast } = EsqlQuery.fromSrc(text);

      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
        fields: [
          { type: 'column', name: 'title' },
          { type: 'column', name: 'description' },
          { type: 'column', name: 'actors' },
        ],
      });
    });
  });

  describe('target field assignment', () => {
    it('should parse target field assignment with correct AST structure', () => {
      const text =
        'FROM movies | RERANK rerank_score = "star wars" ON title WITH { "inference_id" : "reranker" }';
      const { ast } = EsqlQuery.fromSrc(text);

      const rerankCmd = ast.commands[1];

      expect(rerankCmd).toMatchObject({
        type: 'command',
        name: 'rerank',
        query: {
          type: 'literal',
          literalType: 'keyword',
          value: '"star wars"',
        },
        targetField: {
          type: 'column',
          name: 'rerank_score',
        },
        args: expect.arrayContaining([
          expect.objectContaining({
            type: 'function',
            subtype: 'binary-expression',
            name: '=',
          }),
        ]),
      });
    });
  });

  describe('field assignments', () => {
    it('should parse computed field assignments with correct binary expression', () => {
      const text =
        'FROM movies | RERANK "star wars" ON title, overview=SUBSTRING(overview, 0, 100) WITH { "inference_id" : "reranker" }';
      const { ast } = EsqlQuery.fromSrc(text);

      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
        fields: [
          {
            type: 'column',
            name: 'title',
          },
          {
            type: 'function',
            subtype: 'binary-expression',
            name: '=',
            args: [
              {},
              [
                {
                  type: 'function',
                  name: 'substring',
                },
              ],
            ],
          },
        ],
      });
    });

    it('should parse multiple field assignments', () => {
      const text =
        'FROM movies | RERANK "star wars" ON title=BOOST(title, 2), description=BOOST(description, 1.5) WITH { "inference_id" : "reranker" }';
      const { ast } = EsqlQuery.fromSrc(text);
      const rerankCmd = ast.commands[1] as ESQLAstRerankCommand;

      expect(rerankCmd).toMatchObject({
        type: 'command',
        name: 'rerank',
        fields: expect.arrayContaining([
          expect.objectContaining({
            type: 'function',
            subtype: 'binary-expression',
            name: '=',
          }),
          expect.objectContaining({
            type: 'function',
            subtype: 'binary-expression',
            name: '=',
          }),
        ]),
      });

      expect(rerankCmd.fields).toHaveLength(2);
    });
  });

  describe('error cases and edge scenarios and catch errors', () => {
    it('should handle missing query text gracefully', () => {
      const text = 'FROM movies | RERANK ON title WITH { "inference_id" : "reranker" }';
      const { ast, errors } = EsqlQuery.fromSrc(text);

      expect(ast.commands).toHaveLength(2);
      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
      });

      expect(errors).toHaveLength(2);
    });

    it('should handle missing WITH clause', () => {
      const text = 'FROM movies | RERANK "star wars" ON title';
      const { ast } = EsqlQuery.fromSrc(text);
      const rerankCmd = ast.commands[1] as ESQLAstRerankCommand;

      expect(rerankCmd).toMatchObject({
        type: 'command',
        name: 'rerank',
        query: {
          type: 'literal',
          value: '"star wars"',
        },
        fields: [{ type: 'column', name: 'title' }],
      });

      expect(rerankCmd.inferenceId).toEqual(undefined);
    });

    it('should handle missing ON clause', () => {
      const text = 'FROM movies | RERANK "star wars" WITH { "inference_id" : "reranker" }';
      const { ast, errors } = EsqlQuery.fromSrc(text);

      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
      });
      expect(errors).toHaveLength(1);
    });

    it('should handle incomplete WITH clause', () => {
      const text = 'FROM movies | RERANK "star wars" ON title WITH';
      const { ast, errors } = EsqlQuery.fromSrc(text);

      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
      });
      expect(errors).toHaveLength(1);
    });

    it('should handle malformed assignment syntax and catch an error', () => {
      const text = 'FROM movies | RERANK score = ON title WITH { "inference_id" : "test" }';
      const { ast, errors } = EsqlQuery.fromSrc(text);

      expect(ast.commands).toHaveLength(2);
      expect(ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'rerank',
      });

      expect(errors).toHaveLength(1);
    });

    it('should handle empty field list and catch an error', () => {
      const text = 'FROM movies | RERANK "query" ON WITH { "inference_id" : "test" }';
      const { ast, errors } = EsqlQuery.fromSrc(text);
      const rerankCmd = ast.commands[1] as ESQLAstRerankCommand;

      expect(rerankCmd).toMatchObject({
        type: 'command',
        name: 'rerank',
        fields: [],
      });

      expect(errors).toHaveLength(1);
    });
  });

  describe('WITH clause with multiple parameters', () => {
    it('should parse WITH clause containing multiple parameters including scoreColumn', () => {
      const text =
        'FROM movies | RERANK "star wars" ON title, overview=SUBSTRING(overview, 0, 100), actors WITH {"inferenceId":"rerankerInferenceId", "scoreColumn":"rerank_score""}';
      const { ast } = EsqlQuery.fromSrc(text);
      const rerankCmd = ast.commands[1] as ESQLAstRerankCommand;

      expect(rerankCmd).toMatchObject({
        type: 'command',
        name: 'rerank',
        query: {
          type: 'literal',
          value: '"star wars"',
        },
      });

      expect(rerankCmd.fields).toHaveLength(3);
      expect(rerankCmd.fields[0]).toMatchObject({ type: 'column', name: 'title' });
      expect(rerankCmd.fields[1]).toMatchObject({ type: 'function', name: '=' });
      expect(rerankCmd.fields[2]).toMatchObject({ type: 'column', name: 'actors' });

      const withOption = rerankCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'with'
      );

      expect(withOption).toBeDefined();

      if (withOption) {
        const mapArg = withOption.args[0] as any;
        expect(mapArg.type).toBe('map');
        expect(mapArg.entries).toHaveLength(2);

        // Check that all three keys are present
        const keys = mapArg.entries.map((entry: any) => entry.key.value);
        expect(keys).toContain('"inferenceId"');
        expect(keys).toContain('"scoreColumn"');

        // Check that all three values are correct
        const values = mapArg.entries.map((entry: any) => entry.value.value);
        expect(values).toContain('"rerankerInferenceId"');
        expect(values).toContain('"rerank_score"');
      }
    });
  });
});
