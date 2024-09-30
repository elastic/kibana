/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';
import { Walker } from '../walker';

/**
 * Un-named parameters are represented by a question mark "?".
 */
describe('un-named parameters', () => {
  describe('correctly formatted', () => {
    it('can parse a single un-named param', () => {
      const query = 'ROW x = ?';
      const { ast, errors } = parse(query);
      const params = Walker.params(ast);

      expect(errors.length).toBe(0);
      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'unnamed',
          location: {
            min: 8,
            max: 8,
          },
        },
      ]);

      const { min, max } = params[0].location;

      expect(query.slice(min, max + 1)).toBe('?');
    });
  });
});

/**
 * Positional parameters are represented by a question mark followed by a number "?1".
 */
describe('positional parameters', () => {
  describe('correctly formatted', () => {
    it('can parse a single positional param', () => {
      const query = 'ROW x = ?1';
      const { ast, errors } = parse(query);
      const params = Walker.params(ast);

      expect(errors.length).toBe(0);
      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 1,
          location: {
            min: 8,
            max: 9,
          },
        },
      ]);

      const { min, max } = params[0].location;

      expect(query.slice(min, max + 1)).toBe('?1');
    });

    it('multiple positional params', () => {
      const query = 'ROW x = ?5, x2 = ?5, y = ?6, z = ?7';
      const { ast, errors } = parse(query);
      const params = Walker.params(ast);

      expect(errors.length).toBe(0);
      expect(params.length).toBe(4);
      params.sort((a, b) => a.location.min - b.location.min);
      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 5,
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 5,
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 6,
        },
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'positional',
          value: 7,
        },
      ]);
    });
  });
});

/**
 * Named parameters are represented by a question mark followed by a name "?name".
 */
describe('named parameters', () => {
  describe('correctly formatted', () => {
    it('can parse a single named param', () => {
      const query = 'ROW x = ?theName';
      const { ast, errors } = parse(query);
      const params = Walker.params(ast);

      expect(errors.length).toBe(0);
      expect(params).toMatchObject([
        {
          type: 'literal',
          literalType: 'param',
          paramType: 'named',
          value: 'theName',
          location: {
            min: 8,
            max: 15,
          },
        },
      ]);

      const { min, max } = params[0].location;

      expect(query.slice(min, max + 1)).toBe('?theName');
    });
  });

  it('multiple named params', () => {
    const query = 'ROW x = ?a, y = ?b, z = ?c';
    const { ast, errors } = parse(query);
    const params = Walker.params(ast);

    expect(errors.length).toBe(0);
    expect(params.length).toBe(3);
    params.sort((a, b) => a.location.min - b.location.min);
    expect(params).toMatchObject([
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'a',
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'b',
      },
      {
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'c',
      },
    ]);
  });

  describe('when incorrectly formatted, returns errors', () => {
    it('two question marks "?" in a row', () => {
      const text = 'ROW x = ??';
      const { errors } = parse(text);
      expect(errors.length > 0).toBe(true);
    });
  });
});
