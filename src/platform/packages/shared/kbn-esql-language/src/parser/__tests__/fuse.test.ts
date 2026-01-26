/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../core/parser';

describe('FUSE', () => {
  describe('correctly formatted', () => {
    it('can parse FUSE command without modifiers', () => {
      const text = `FROM index | FUSE`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [],
      });
    });

    it('can parse FUSE with a type', () => {
      const text = `FROM search-movies METADATA _score, _id, _index
                    | FORK
                      ( WHERE semantic_title:"Shakespeare" | SORT _score)
                      ( WHERE title:"Shakespeare" | SORT _score)
                    | FUSE rrf
                    | KEEP title, _score`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[2]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'identifier',
            name: 'rrf',
          },
        ],
      });
    });

    it('can parse FUSE with SCORE BY', () => {
      const text = `FROM index | FUSE SCORE BY new_score`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'score by',
            args: [{ type: 'column', name: 'new_score' }],
            incomplete: false,
          },
        ],
        incomplete: false,
      });
    });

    it('can parse FUSE with KEY BY', () => {
      const text = `FROM index | FUSE KEY BY field1, field2`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'key by',
            args: [
              { type: 'column', name: 'field1' },
              { type: 'column', name: 'field2' },
            ],
            incomplete: false,
          },
        ],
        incomplete: false,
      });
    });

    it('can parse FUSE with GROUP BY', () => {
      const text = `FROM index | FUSE GROUP BY group_field`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'group by',
            args: [{ type: 'column', name: 'group_field' }],
            incomplete: false,
          },
        ],
        incomplete: false,
      });
    });

    it('can parse FUSE with WITH', () => {
      const text = `FROM index | FUSE WITH { "normalizer": "minmax" }`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'with',
            args: [
              {
                type: 'map',
                entries: [
                  {
                    type: 'map-entry',
                    key: { valueUnquoted: 'normalizer' },
                    value: { type: 'literal', literalType: 'keyword', value: '"minmax"' },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('can parse FUSE with all modifiers', () => {
      const text = `FROM index
                    | FUSE rrf SCORE BY new_score KEY BY k1, k2 GROUP BY g WITH { "normalizer": "minmax" }`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          { type: 'identifier', name: 'rrf' },
          {
            type: 'option',
            name: 'score by',
            args: [{ type: 'column', name: 'new_score' }],
          },
          {
            type: 'option',
            name: 'key by',
            args: [
              { type: 'column', name: 'k1' },
              { type: 'column', name: 'k2' },
            ],
          },
          {
            type: 'option',
            name: 'group by',
            args: [{ type: 'column', name: 'g' }],
          },
          {
            type: 'option',
            name: 'with',
            args: [
              {
                type: 'map',
                entries: [
                  {
                    type: 'map-entry',
                    key: { valueUnquoted: 'normalizer' },
                    value: { type: 'literal', literalType: 'keyword', value: '"minmax"' },
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  describe('when incorrectly formatted, return errors', () => {
    it('when no pipe after', () => {
      const text = `FROM index | FUSE KEEP title, _score`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when no pipe between FORK and FUSE', () => {
      const text = `FROM search-movies METADATA _score, _id, _index
                    | FORK
                      ( WHERE semantic_title:"Shakespeare" | SORT _score)
                      ( WHERE title:"Shakespeare" | SORT _score) FUSE`;

      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('can parse FUSE with incomplete SCORE BY', () => {
      const text = `FROM index | FUSE SCORE BY `;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(1);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'score by',
            args: [],
            incomplete: true,
          },
        ],
        incomplete: true,
      });
    });

    it('can parse FUSE with incomplete KEY BY ', () => {
      const text = `FROM index | FUSE KEY BY `;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(1);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'key by',
            args: [],
            incomplete: true,
          },
        ],
        incomplete: true,
      });
    });

    it('can parse FUSE with incomplete GROUP BY', () => {
      const text = `FROM index | FUSE GROUP BY `;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(1);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'group by',
            args: [],
            incomplete: true,
          },
        ],
        incomplete: true,
      });
    });

    it('can parse FUSE with incomplete WITH', () => {
      const text = `FROM index | FUSE WITH `;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(1);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'with',
            args: [],
            incomplete: true,
          },
        ],
        incomplete: true,
      });
    });

    it('can parse FUSE with incomplete WITH map expression', () => {
      const text = `FROM index | FUSE WITH {"normalizer":}`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(1);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'with',
            args: [
              {
                type: 'map',
                incomplete: true,
              },
            ],
            incomplete: true,
          },
        ],
        incomplete: true,
      });
    });

    // This one is a syntactic valid query, but it's semantically invalid
    // The parser should not be responsible for catching this kind of error
    // However, we still want to make sure the AST is correctly generated
    it('can parse FUSE with duplicated modifiers', () => {
      const text = `FROM index | FUSE SCORE BY s1 SCORE BY s2`;

      const { root, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(root.commands[1]).toMatchObject({
        type: 'command',
        name: 'fuse',
        args: [
          {
            type: 'option',
            name: 'score by',
            args: [{ type: 'column', name: 's1' }],
            incomplete: false,
          },
          {
            type: 'option',
            name: 'score by',
            args: [{ type: 'column', name: 's2' }],
            incomplete: false,
          },
        ],
        incomplete: false,
      });
    });
  });
});
