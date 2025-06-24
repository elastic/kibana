/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { ESQLCommandOption } from '../../types';
import { Walker } from '../../walker';

describe('CHANGE_POINT command', () => {
  describe('correctly formatted', () => {
    describe('CHANGE_POINT <value> ...', () => {
      it('can parse the command', () => {
        const text = `FROM index | CHANGE_POINT value`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          type: 'command',
          name: 'change_point',
        });
      });

      it('parses value expression as command field', () => {
        const text = `FROM index | CHANGE_POINT value`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          value: {
            type: 'column',
            name: 'value',
          },
        });
      });

      it('parses value expression as the first argument', () => {
        const text = `FROM index | CHANGE_POINT value`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          args: [
            {
              type: 'column',
              name: 'value',
            },
          ],
        });
      });
    });

    describe('... ON key ...', () => {
      it('parses key expression as command field', () => {
        const text = `FROM index | CHANGE_POINT value ON key`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          key: {
            type: 'column',
            name: 'key',
          },
        });
      });

      it('parses key expression as command argument', () => {
        const text = `FROM index | CHANGE_POINT value ON key`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          args: [
            {},
            {
              type: 'option',
              name: 'on',
              args: [
                {
                  type: 'column',
                  name: 'key',
                },
              ],
            },
          ],
        });
      });

      it('parses correctly ON option location', () => {
        const text = `FROM index | CHANGE_POINT value ON key`;
        const query = EsqlQuery.fromSrc(text);
        const option = query.ast.commands[1].args[1] as ESQLCommandOption;

        expect(option).toMatchObject({
          type: 'option',
          name: 'on',
        });
        expect(text.slice(option.location!.min, option.location!.max + 1)).toBe('ON key');
      });
    });

    describe('... AS type, pvalue', () => {
      it('parses AS option as command field', () => {
        const text = `FROM index | CHANGE_POINT value AS type, pvalue`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          target: {
            type: {
              type: 'column',
              name: 'type',
            },
            pvalue: {
              type: 'column',
              name: 'pvalue',
            },
          },
        });
      });

      it('parses AS option as command argument', () => {
        const text = `FROM index | CHANGE_POINT value AS type, pvalue`;
        const query = EsqlQuery.fromSrc(text);

        expect(query.ast.commands[1]).toMatchObject({
          args: [
            {},
            {
              type: 'option',
              name: 'as',
              args: [
                {
                  type: 'column',
                  name: 'type',
                },
                {
                  type: 'column',
                  name: 'pvalue',
                },
              ],
            },
          ],
        });
      });

      it('correctly reports AS option location', () => {
        const text = `FROM index | CHANGE_POINT value AS /* hello */ type, /* world */ pvalue`;
        const query = EsqlQuery.fromSrc(text);
        const option = query.ast.commands[1].args[1] as ESQLCommandOption;

        expect(option).toMatchObject({
          type: 'option',
          name: 'as',
        });
        expect(text.slice(option.location!.min, option.location!.max + 1)).toBe(
          'AS /* hello */ type, /* world */ pvalue'
        );
      });
    });

    it('parses example query with all options', () => {
      const text = `
        FROM k8s
          | STATS count=COUNT() BY @timestamp=BUCKET(@timestamp, 1 MINUTE)
          | CHANGE_POINT count ON @timestamp AS type, pvalue
      `;
      const query = EsqlQuery.fromSrc(text);
      const command = Walker.match(query.ast, { type: 'command', name: 'change_point' });

      expect(command).toMatchObject({
        type: 'command',
        name: 'change_point',
        value: {
          type: 'column',
          name: 'count',
        },
        key: {
          type: 'column',
          name: '@timestamp',
        },
        target: {
          type: {
            type: 'column',
            name: 'type',
          },
          pvalue: {
            type: 'column',
            name: 'pvalue',
          },
        },
        args: [
          {
            type: 'column',
            name: 'count',
          },
          {
            type: 'option',
            name: 'on',
            args: [
              {
                type: 'column',
                name: '@timestamp',
              },
            ],
          },
          {
            type: 'option',
            name: 'as',
            args: [
              {
                type: 'column',
                name: 'type',
              },
              {
                type: 'column',
                name: 'pvalue',
              },
            ],
          },
        ],
      });
    });
  });

  describe('incorrectly formatted', () => {
    it('throws on missing ON arguments', () => {
      const text = `FROM index | CHANGE_POINT value ON`;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      const option = Walker.match(ast, { type: 'option', name: 'on' });

      expect(errors.length).toBe(1);
      expect(option).toBe(undefined);
    });

    it('throws on missing AS arguments', () => {
      const text = `FROM index | CHANGE_POINT value AS`;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      const option = Walker.match(ast, { type: 'option', name: 'as' });

      expect(errors.length).toBe(1);
      expect(option).toBe(undefined);
    });

    it('throws on missing AS arguments (ON present)', () => {
      const text = `FROM index | CHANGE_POINT value ON a AS`;
      const { errors, ast } = EsqlQuery.fromSrc(text);
      const option = Walker.match(ast, { type: 'option', name: 'as' });

      expect(errors.length).toBe(1);
      expect(option).toBe(undefined);
    });
  });
});
