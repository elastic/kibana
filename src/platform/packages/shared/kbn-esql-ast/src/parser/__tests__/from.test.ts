/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';

describe('FROM', () => {
  describe('correctly formatted', () => {
    it('can parse basic FROM query', () => {
      const text = 'FROM kibana_ecommerce_data';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'kibana_ecommerce_data',
              sourceType: 'index',
            },
          ],
        },
      ]);
    });

    it('can parse FROM query with multiple index identifiers', () => {
      const text = '\tFROM foo, bar \t\t, \n  baz';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'foo',
              sourceType: 'index',
            },
            {
              type: 'source',
              name: 'bar',
              sourceType: 'index',
            },
            {
              type: 'source',
              name: 'baz',
              sourceType: 'index',
            },
          ],
        },
      ]);
    });

    it('can parse FROM query with single quote or triple quote', () => {
      const text = '\tFROM "foo%" \t\t, """bar{{00-00}}""", \n  baz';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'foo%',
              sourceType: 'index',
            },
            {
              type: 'source',
              name: 'bar{{00-00}}',
              sourceType: 'index',
            },
            {
              type: 'source',
              name: 'baz',
              sourceType: 'index',
            },
          ],
        },
      ]);
    });

    it('can parse FROM query with a single metadata column', () => {
      const text = 'from foo METADATA bar';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'foo',
              sourceType: 'index',
            },
            {
              type: 'option',
              name: 'metadata',
              args: [
                {
                  type: 'column',
                  name: 'bar',
                  quoted: false,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('can parse FROM query with multiple metadata columns', () => {
      const text = 'from kibana_sample_data_ecommerce METADATA _index, \n _id\n';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'kibana_sample_data_ecommerce',
              sourceType: 'index',
            },
            {
              type: 'option',
              name: 'metadata',
              args: [
                {
                  type: 'column',
                  name: '_index',
                  quoted: false,
                },
                {
                  type: 'column',
                  name: '_id',
                  quoted: false,
                },
              ],
            },
          ],
        },
      ]);
    });

    describe('source', () => {
      describe('index', () => {
        it('can parse single-double quoted index', () => {
          const text = 'FROM "index"';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  sourceType: 'index',
                  index: {
                    type: 'literal',
                    literalType: 'keyword',
                    valueUnquoted: 'index',
                  },
                },
              ],
            },
          ]);
        });

        it('can parse triple-double quoted index', () => {
          const text = 'FROM """index"""';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  sourceType: 'index',
                  index: {
                    type: 'literal',
                    literalType: 'keyword',
                    valueUnquoted: 'index',
                  },
                },
              ],
            },
          ]);
        });
      });

      describe('cluster', () => {
        it('can parse unquoted cluster', () => {
          const text = 'FROM cluster:index';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  index: {
                    valueUnquoted: 'index',
                  },
                  sourceType: 'index',
                  prefix: {
                    type: 'literal',
                    literalType: 'keyword',
                    valueUnquoted: 'cluster',
                    unquoted: true,
                  },
                },
              ],
            },
          ]);
        });

        it('can parse single-double quoted cluster pair', () => {
          const text = 'FROM "cluster:index"';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  index: {
                    valueUnquoted: 'cluster:index',
                  },
                  sourceType: 'index',
                  prefix: undefined,
                },
              ],
            },
          ]);
        });

        it('can parse triple-double quoted cluster pair', () => {
          const text = 'FROM """cluster:index"""';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  index: {
                    valueUnquoted: 'cluster:index',
                  },
                  sourceType: 'index',
                  prefix: undefined,
                },
              ],
            },
          ]);
        });
      });

      describe('selector', () => {
        it('can parse source selector', () => {
          const text = 'FROM index::selector';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  index: {
                    valueUnquoted: 'index',
                  },
                  sourceType: 'index',
                  selector: {
                    type: 'literal',
                    literalType: 'keyword',
                    valueUnquoted: 'selector',
                    unquoted: true,
                  },
                },
              ],
            },
          ]);
        });

        it('can parse single and triple quoted selectors', () => {
          const text = 'FROM "index1::selector1", "index2::selector2"';
          const { root, errors } = parse(text);

          expect(errors.length).toBe(0);
          expect(root.commands).toMatchObject([
            {
              type: 'command',
              name: 'from',
              args: [
                {
                  type: 'source',
                  index: {
                    valueUnquoted: 'index1::selector1',
                  },
                  sourceType: 'index',
                  selector: undefined,
                },
                {
                  type: 'source',
                  index: {
                    valueUnquoted: 'index2::selector2',
                  },
                  sourceType: 'index',
                  selector: undefined,
                },
              ],
            },
          ]);
        });
      });
    });
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('when no index identifier specified', () => {
      const text = 'FROM \n\t';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when comma is not followed by an index identifier', () => {
      const text = '\tFROM foo, ';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when metadata has not columns', () => {
      const text = 'from foo METADATA \t';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });

    it('when metadata columns finish with a trailing comma', () => {
      const text = 'from kibana_sample_data_ecommerce METADATA _index,';
      const { errors } = parse(text);

      expect(errors.length > 0).toBe(true);
    });
  });
});
