/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../../../pretty_print';
import * as commands from '..';
import { EsqlQuery } from '../../../../composer/query';
import type { ESQLAstItem, ESQLCommandOption, ESQLMap } from '../../../../types';
import { isStringLiteral } from '../../../is';

describe('commands.rerank', () => {
  describe('.list()', () => {
    it('lists the only "RERANK" commands', () => {
      const src =
        'FROM index | LIMIT 1 | RERANK "star wars" ON title, overview=SUBSTRING(overview, 0, 100), actors WITH  { "inference_id": "model_id" } | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const nodes = [...commands.rerank.list(query.ast)];

      expect(nodes).toMatchObject([
        {
          type: 'command',
          name: 'rerank',
        },
      ]);
    });
  });

  describe('.setQuery()', () => {
    it('can change query', () => {
      const src =
        'FROM index | RERANK "star wars" ON field WITH { "inference_id": "model_id" } | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];
      commands.rerank.setQuery(cmd, 'new query');

      expect(BasicPrettyPrinter.expression(cmd.query)).toBe('"new query"');
      expect(query.print({ wrap: Infinity })).toBe(
        'FROM index | RERANK "new query" ON field WITH {"inference_id": "model_id"} | LIMIT 2'
      );
    });
  });

  it('can change query on a command with a target assignment', () => {
    const src =
      'FROM index | RERANK my_target = "star wars" ON field WITH { "inference_id": "model_id" }';
    const query = EsqlQuery.fromSrc(src);

    const cmd = [...commands.rerank.list(query.ast)][0];
    commands.rerank.setQuery(cmd, 'new query');

    expect(BasicPrettyPrinter.expression(cmd.query)).toBe('"new query"');
    expect(query.print({ wrap: Infinity })).toBe(
      'FROM index | RERANK my_target = "new query" ON field WITH {"inference_id": "model_id"}'
    );
  });
});

describe('.setTargetField()', () => {
  it('can add a target field to a simple command', () => {
    const src = 'FROM index | RERANK "star wars" ON field';
    const query = EsqlQuery.fromSrc(src);

    const cmd = [...commands.rerank.list(query.ast)][0];
    commands.rerank.setTargetField(cmd, 'my_target');

    expect(query.print({ wrap: Infinity })).toBe(
      'FROM index | RERANK my_target = "star wars" ON field'
    );
  });

  it('can change an existing target field', () => {
    const src = 'FROM index | RERANK old_target = "star wars" ON field';
    const query = EsqlQuery.fromSrc(src);

    const cmd = [...commands.rerank.list(query.ast)][0];
    commands.rerank.setTargetField(cmd, 'new_target');

    expect(query.print({ wrap: Infinity })).toBe(
      'FROM index | RERANK new_target = "star wars" ON field'
    );
  });

  it('can remove an existing target field', () => {
    const src = 'FROM index | RERANK my_target = "star wars" ON field';
    const query = EsqlQuery.fromSrc(src);

    const cmd = [...commands.rerank.list(query.ast)][0];
    commands.rerank.setTargetField(cmd, null);

    expect(query.print({ wrap: Infinity })).toBe('FROM index | RERANK "star wars" ON field');
  });

  describe('.setFields()', () => {
    it('can change query', () => {
      const src =
        'FROM index | RERANK "star wars" ON field WITH { "inference_id": "model_id" } | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];
      commands.rerank.setFields(cmd, ['a', 'b', '@timestamp']);

      expect(cmd.fields.map((field) => BasicPrettyPrinter.expression(field))).toEqual([
        'a',
        'b',
        '@timestamp',
      ]);
      expect(query.print({ wrap: Infinity })).toBe(
        'FROM index | RERANK "star wars" ON a, b, @timestamp WITH {"inference_id": "model_id"} | LIMIT 2'
      );
    });

    it('should throw error when ON option is missing', () => {
      const src = 'FROM index | RERANK "star wars"';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];

      expect(() => commands.rerank.setFields(cmd, ['newField'])).toThrow(
        'RERANK command must have a ON option'
      );
    });
  });

  describe('.setWithParameter()', () => {
    it('can add and update a new parameter to WITH map', () => {
      const src =
        'FROM index | RERANK "star wars" ON field WITH { "inference_id": "model_id" } | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];
      commands.rerank.setWithParameter(cmd, 'scoreColumn', 'first_rank_score'); // create
      commands.rerank.setWithParameter(cmd, 'scoreColumn', 'rank_score'); // update

      const isWithOption = (arg: ESQLAstItem): arg is ESQLCommandOption =>
        !!arg && !Array.isArray(arg) && arg.type === 'option' && arg.name === 'with';

      const map = cmd.args.find(isWithOption)!.args[0] as ESQLMap;
      const scoreColumnEntry = map?.entries?.find(
        (entry) => isStringLiteral(entry.key) && entry.key.valueUnquoted === 'scoreColumn'
      );

      expect(BasicPrettyPrinter.expression(scoreColumnEntry!.value)).toBe('"rank_score"');
      expect(query.print({ wrap: Infinity })).toBe(
        'FROM index | RERANK "star wars" ON field WITH {"inference_id": "model_id", "scoreColumn": "rank_score"} | LIMIT 2'
      );
    });
  });
});
