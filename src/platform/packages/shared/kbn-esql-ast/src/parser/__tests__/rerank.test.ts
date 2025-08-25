/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import type { ESQLAstRerankCommand } from '../../types';

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
            args: expect.arrayContaining([
              expect.objectContaining({ type: 'column', name: 'overview' }),
              expect.arrayContaining([
                expect.objectContaining({
                  type: 'function',
                  name: 'substring',
                }),
              ]),
            ]),
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
        fields: [], // Parser returns empty fields when query is missing
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

      expect(rerankCmd).not.toHaveProperty('inferenceId');
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
        fields: [
          expect.objectContaining({
            type: 'column',
            incomplete: true,
          }),
        ],
      });

      expect(errors).toHaveLength(1);
    });
  });
});
