/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import type { ESQLCommand, ESQLSource } from '../../types';
import { Walker } from '../../ast/walker';

describe('ENRICH', () => {
  describe('correctly formatted', () => {
    it('most basic example', () => {
      const query = 'FROM index | ENRICH a ON b WITH c, d';
      const { root } = parse(query);

      expect(root.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'enrich',
          args: [
            {
              type: 'source',
              name: 'a',
              index: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'a',
              },
            },
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'column',
                  name: 'b',
                },
              ],
            },
            {
              type: 'option',
              name: 'with',
            },
          ],
        },
      ]);
    });

    it('parses out source mode and index pattern', () => {
      const query = 'FROM index | ENRICH mode:a ON b WITH c, d';
      const { root } = parse(query);

      expect(root.commands).toMatchObject([
        {},
        {
          type: 'command',
          name: 'enrich',
          args: [
            {
              type: 'source',
              name: 'mode:a',
              prefix: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'mode',
              },
              index: {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'a',
              },
            },
            { name: 'on' },
            { name: 'with' },
          ],
        },
      ]);
    });

    it('correctly parses source argument positions in text', () => {
      const src = 'FROM index | ENRICH mode:index ON b WITH c, d';
      const { root } = parse(src);
      const enrich = Walker.match(root, { type: 'command', name: 'enrich' })! as ESQLCommand;

      expect(src.slice(enrich.location.min, enrich.location.max + 1)).toEqual(
        'ENRICH mode:index ON b WITH c, d'
      );

      const source = enrich.args[0] as ESQLSource;

      expect(src.slice(source.location.min, source.location.max + 1)).toEqual('mode:index');
      expect(src.slice(source.prefix!.location.min, source.prefix!.location.max + 1)).toEqual(
        'mode'
      );
      expect(src.slice(source.index!.location.min, source.index!.location.max + 1)).toEqual(
        'index'
      );
    });

    it('correctly parses source argument positions in text (no cluster mode)', () => {
      const src = 'FROM index | ENRICH index ON b WITH c, d';
      const { root } = parse(src);
      const enrich = Walker.match(root, { type: 'command', name: 'enrich' })! as ESQLCommand;

      expect(src.slice(enrich.location.min, enrich.location.max + 1)).toEqual(
        'ENRICH index ON b WITH c, d'
      );

      const source = enrich.args[0] as ESQLSource;

      expect(src.slice(source.location.min, source.location.max + 1)).toEqual('index');
      expect(source.prefix).toBe(undefined);
      expect(src.slice(source.index!.location.min, source.index!.location.max + 1)).toEqual(
        'index'
      );
    });
  });

  describe('when query not correctly formatted', () => {
    it('correctly reports positions when extraneous ":"', () => {
      const src = 'FROM index | ENRICH cluster: ON b WITH c, d';
      const { root, errors } = parse(src);
      const enrich = Walker.match(root, { type: 'command', name: 'enrich' })! as ESQLCommand;

      expect(errors.length > 0).toBe(true);

      expect(src.slice(enrich.location.min, enrich.location.max + 1)).toEqual(
        'ENRICH cluster: ON b WITH c, d'
      );

      const source = enrich.args[0] as ESQLSource;

      expect(src.slice(source.location.min, source.location.max + 1)).toEqual('cluster');
      expect(source.prefix).toBe(undefined);
      expect(src.slice(source.index!.location.min, source.index!.location.max + 1)).toEqual(
        'cluster'
      );
    });
  });
});
