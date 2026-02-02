/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import type { ESQLAstQueryExpression, ESQLParens } from '../../types';
import { isParens, isSubQuery } from '../../ast/is';

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

  describe('subqueries', () => {
    it('can parse simple subquery', () => {
      const text = 'FROM index1, (FROM index2 | WHERE a > 10)';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toMatchObject([
        {
          type: 'command',
          name: 'from',
          args: [
            {
              type: 'source',
              name: 'index1',
            },
            {
              type: 'parens',
              child: {
                type: 'query',
                commands: [
                  { type: 'command', name: 'from' },
                  { type: 'command', name: 'where' },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('can parse subquery as only source', () => {
      const text = 'FROM (FROM index1 | WHERE x > 0)';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast[0].args).toHaveLength(1);
      expect(ast[0].args[0]).toMatchObject({
        type: 'parens',
        child: {
          type: 'query',
          commands: [{ name: 'from' }, { name: 'where' }],
        },
      });
    });

    it('can parse subquery followed by main query pipes', () => {
      const text = 'FROM (FROM index1 | WHERE a > 0) | WHERE b < 10 | LIMIT 5';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast).toHaveLength(3);
      expect(ast[0].name).toBe('from');
      expect(ast[1].name).toBe('where');
      expect(ast[2].name).toBe('limit');
    });

    it('correctly captures location for deeply nested subqueries (3 levels)', () => {
      const text = 'FROM (FROM (FROM (FROM index | WHERE a > 0) | WHERE b < 10) | LIMIT 5)';
      const { ast } = parse(text);

      // Level 1 - outermost
      const level1Parens = ast[0].args[0] as ESQLParens;
      expect(text.slice(level1Parens.location.min, level1Parens.location.max + 1)).toBe(
        '(FROM (FROM (FROM index | WHERE a > 0) | WHERE b < 10) | LIMIT 5)'
      );

      // Level 2 - middle
      const level1Query = level1Parens.child as ESQLAstQueryExpression;
      const level2Parens = level1Query.commands[0].args[0] as ESQLParens;
      expect(text.slice(level2Parens.location.min, level2Parens.location.max + 1)).toBe(
        '(FROM (FROM index | WHERE a > 0) | WHERE b < 10)'
      );

      // Level 3 - innermost
      const level2Query = level2Parens.child as ESQLAstQueryExpression;
      const level3Parens = level2Query.commands[0].args[0] as ESQLParens;
      expect(text.slice(level3Parens.location.min, level3Parens.location.max + 1)).toBe(
        '(FROM index | WHERE a > 0)'
      );
    });

    describe('error cases', () => {
      it('errors on unclosed subquery and captures location up to end of content', () => {
        const text = 'FROM (FROM index | WHERE a > 10';
        const { ast, errors } = parse(text);

        expect(errors.length).toBeGreaterThan(0);

        const parens = ast[0].args[0] as ESQLParens;

        expect(isParens(parens)).toBe(true);
        expect(isSubQuery(parens)).toBe(true);
        expect(parens.incomplete).toBe(true);

        const query = parens.child as ESQLAstQueryExpression;

        expect(query.incomplete).toBe(true);
        expect(query.commands).toHaveLength(2);

        // Verify location captures everything including missing closing paren
        expect(text.slice(parens.location.min, parens.location.max + 1)).toBe(
          '(FROM index | WHERE a > 10'
        );
      });

      it('errors on empty subquery', () => {
        const text = 'FROM index, ()';
        const { errors } = parse(text);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('errors on subquery without FROM', () => {
        const text = 'FROM (WHERE a > 10)';
        const { errors } = parse(text);

        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });
});
