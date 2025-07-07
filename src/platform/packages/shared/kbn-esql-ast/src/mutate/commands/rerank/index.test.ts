/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../../pretty_print';
import * as commands from '..';
import { EsqlQuery } from '../../../query';

/**
 * @todo Tests skipped, while RERANK command grammar is being stabilized. We will
 * get back to it after 9.1 release.
 */
describe.skip('commands.rerank', () => {
  describe('.list()', () => {
    it('lists the only "RERANK" commands', () => {
      const src =
        'FROM index | LIMIT 1 | RERANK "star wars" ON title, overview=SUBSTRING(overview, 0, 100), actors WITH rerankerInferenceId | LIMIT 2';
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
      const src = 'FROM index | LIMIT 1 | RERANK "star wars" ON field WITH id | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];
      commands.rerank.setQuery(cmd, 'new query');

      expect(BasicPrettyPrinter.expression(cmd.query)).toBe('"new query"');
      expect(query.print()).toBe(
        'FROM index | LIMIT 1 | RERANK "new query" ON field WITH id | LIMIT 2'
      );
    });
  });

  describe('.setFields()', () => {
    it('can change query', () => {
      const src = 'FROM index | LIMIT 1 | RERANK "star wars" ON field WITH id | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];
      commands.rerank.setFields(cmd, ['a', 'b', '@timestamp']);

      expect(cmd.fields.map((field) => BasicPrettyPrinter.expression(field))).toEqual([
        'a',
        'b',
        '@timestamp',
      ]);
      expect(query.print()).toBe(
        'FROM index | LIMIT 1 | RERANK "star wars" ON a, b, @timestamp WITH id | LIMIT 2'
      );
    });
  });

  describe('.setInferenceId()', () => {
    it('can change query', () => {
      const src = 'FROM index | LIMIT 1 | RERANK "star wars" ON field WITH id | LIMIT 2';
      const query = EsqlQuery.fromSrc(src);

      const cmd = [...commands.rerank.list(query.ast)][0];
      commands.rerank.setInferenceId(cmd, 'new_id');

      expect(BasicPrettyPrinter.expression(cmd.inferenceId)).toBe('new_id');
      expect(query.print()).toBe(
        'FROM index | LIMIT 1 | RERANK "star wars" ON field WITH new_id | LIMIT 2'
      );
    });
  });
});
