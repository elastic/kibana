/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import type { ESQLAstMmrCommand, ESQLCommandOption, ESQLMap } from '../../types';

describe('MMR command', () => {
  describe('basic parsing', () => {
    it('parses MMR with query vector parameter, ON, LIMIT, and WITH', () => {
      const text =
        'FROM movies | MMR [0.5, 0.4, 0.3, 0.2]::dense_vector ON genre LIMIT 10 WITH { "lambda": 0.7 }';
      const { ast } = EsqlQuery.fromSrc(text);
      const mmrCmd = ast.commands[1] as ESQLAstMmrCommand;

      expect(mmrCmd).toMatchObject({
        type: 'command',
        name: 'mmr',
      });

      expect(mmrCmd.queryVector).toMatchObject({
        type: 'inlineCast',
        castType: 'dense_vector',
      });

      expect(mmrCmd.diversifyField).toMatchObject({
        type: 'identifier',
        name: 'genre',
      });

      expect(mmrCmd.limit).toMatchObject({
        type: 'literal',
        literalType: 'integer',
        value: 10,
      });

      expect(mmrCmd.namedParameters).toMatchObject({
        type: 'map',
        entries: [
          {
            type: 'map-entry',
            key: { type: 'literal', value: '"lambda"' },
            value: { type: 'literal', literalType: 'double', value: 0.7 },
          },
        ],
      });

      const onOption = mmrCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'on'
      );

      expect(onOption).toMatchObject({
        type: 'option',
        name: 'on',
        args: [{ type: 'column', name: 'genre' }],
      });

      const limitOption = mmrCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'limit'
      );

      expect(limitOption).toMatchObject({
        type: 'option',
        name: 'limit',
        args: [
          {
            type: 'literal',
            literalType: 'integer',
            value: 10,
          },
        ],
      });

      const withOption = mmrCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'with'
      );

      expect(withOption).toBeDefined();

      if (withOption) {
        const mapArg = withOption.args[0] as ESQLMap;

        expect(mapArg.type).toBe('map');
        expect(mapArg.entries).toHaveLength(1);
        expect(mapArg.entries[0]).toMatchObject({
          type: 'map-entry',
          key: { type: 'literal', value: '"lambda"' },
          value: { type: 'literal', literalType: 'double', value: 0.7 },
        });
      }
    });

    it('parses MMR without a query vector', () => {
      const text = 'FROM movies | MMR ON genre LIMIT 5 WITH { "lambda": 0.3 }';
      const { ast } = EsqlQuery.fromSrc(text);
      const mmrCmd = ast.commands[1] as ESQLAstMmrCommand;

      expect(mmrCmd.queryVector).toBeUndefined();
      expect(mmrCmd.diversifyField).toMatchObject({ type: 'identifier', name: 'genre' });
      expect(mmrCmd.limit).toMatchObject({ type: 'literal', literalType: 'integer', value: 5 });
      expect(mmrCmd.args).toHaveLength(3);
    });

    it('parses MMR without WITH clause', () => {
      const text = 'FROM movies | MMR ON genre LIMIT 3';
      const { ast } = EsqlQuery.fromSrc(text);
      const mmrCmd = ast.commands[1] as ESQLAstMmrCommand;

      expect(mmrCmd.diversifyField).toMatchObject({ type: 'identifier', name: 'genre' });
      expect(mmrCmd.limit).toMatchObject({ type: 'literal', literalType: 'integer', value: 3 });
      expect(mmrCmd.namedParameters).toBeUndefined();
      expect(mmrCmd.args).toHaveLength(2);
    });
  });
});
