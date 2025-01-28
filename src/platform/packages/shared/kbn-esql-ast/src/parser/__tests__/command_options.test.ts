/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { Walker } from '../../walker';

describe('command options', () => {
  describe('parses correctly location', () => {
    describe('FROM', () => {
      it('parses correctly METADATA option position', () => {
        const query = 'FROM a METADATA b';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'metadata' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'metadata',
          location: {
            min: 'FROM a '.length,
            max: 'FROM a METADATA b'.length - 1,
          },
        });
      });

      it('parses correctly METADATA option position position with multiple arguments', () => {
        const query =
          'FROM kibana_e_commerce, index_pattern METADATA _id, _index | STATS b BY c | LIMIT 123';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'metadata' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'metadata',
          location: {
            min: 'FROM kibana_e_commerce, index_pattern '.length,
            max: 'FROM kibana_e_commerce, index_pattern METADATA _id, _index'.length - 1,
          },
        });
      });
    });

    describe('ENRICH', () => {
      it('parses correctly ON option position in ENRICH command', () => {
        const query = 'FROM a | ENRICH b ON c';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'on' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'on',
          location: {
            min: 'FROM a | ENRICH b '.length,
            max: 'FROM a | ENRICH b ON c'.length - 1,
          },
        });
      });

      it('parses correctly WITH option in ENRICH command', () => {
        const query = 'FROM a | ENRICH b ON c WITH d';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'with' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'with',
          location: {
            min: 'FROM a | ENRICH b ON c '.length,
            max: 'FROM a | ENRICH b ON c WITH d'.length - 1,
          },
        });
      });

      it('parses correctly WITH option with multiple arguments in ENRICH command', () => {
        const query = 'FROM a | ENRICH b ON c WITH d, e,f | LIMIT 1000000';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'with' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'with',
          location: {
            min: 'FROM a | ENRICH b ON c '.length,
            max: 'FROM a | ENRICH b ON c WITH d, e,f'.length - 1,
          },
        });
      });

      it('parses correctly WITH option position with assignment in ENRICH command', () => {
        const query = 'FROM a | ENRICH b ON c WITH d, e = policy,f = something | LIMIT 1000000';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'with' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'with',
          location: {
            min: 'FROM a | ENRICH b ON c '.length,
            max: 'FROM a | ENRICH b ON c WITH d, e = policy,f = something'.length - 1,
          },
        });
      });
    });

    describe('STATS', () => {
      it('parses correctly BY option in STATS command', () => {
        const query = 'FROM a | STATS b BY c';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'by' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'by',
          location: {
            min: 'FROM a | STATS b '.length,
            max: 'FROM a | STATS b BY c'.length - 1,
          },
        });
      });

      it('parses correctly BY option with multiple arguments in STATS command', () => {
        const query = 'FROM a | STATS b BY c, long.field.name | LIMIT 1000000';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'by' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'by',
          location: {
            min: 'FROM a | STATS b '.length,
            max: 'FROM a | STATS b BY c, long.field.name'.length - 1,
          },
        });
      });
    });

    describe('RENAME', () => {
      it('parses correctly AS option position in RENAME command', () => {
        const query = 'FROM a | RENAME b AS c';
        const { root } = parse(query);
        const option = Walker.match(root, { type: 'option', name: 'as' });

        expect(option).toMatchObject({
          type: 'option',
          name: 'as',
          location: {
            // The "AS" option is unusual as the it contains the argument before
            // it, the "a" argument. It should not be the case. The "AS" option
            // should not exist at all, should be replaced by a *rename expression*
            // in the future: https://github.com/elastic/kibana/issues/190360
            min: 'FROM a | RENAME '.length,
            max: 'FROM a | RENAME b AS c'.length - 1,
          },
        });
      });
    });
  });
});
