/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import { ESQLFunction, ESQLInlineCast, ESQLSingleAstItem } from '../../types';

describe('Inline cast (::)', () => {
  describe('correctly formatted', () => {
    it('can be a command argument', () => {
      const text = 'FROM kibana_ecommerce_data | EVAL field::string';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect(ast[1].args[0]).toEqual(
        expect.objectContaining({
          castType: 'string',
          name: '',
          type: 'inlineCast',
          value: expect.objectContaining({
            name: 'field',
            type: 'column',
          }),
        })
      );
    });

    it('can be a function argument', () => {
      const text = 'FROM kibana_ecommerce_data | EVAL round(field::long)';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      expect((ast[1].args[0] as ESQLFunction).args[0]).toEqual(
        expect.objectContaining({
          castType: 'long',
          name: '',
          type: 'inlineCast',
          value: expect.objectContaining({
            name: 'field',
            type: 'column',
          }),
        })
      );
    });

    it('can be nested', () => {
      const text = 'FROM kibana_ecommerce_data | EVAL field::long::string::datetime';
      const { ast, errors } = parse(text);

      expect(errors.length).toBe(0);
      let currentNode = ast[1].args[0];
      let depth = 0;

      while (depth < 3) {
        expect((currentNode as ESQLSingleAstItem).type).toBe('inlineCast');
        currentNode = (currentNode as ESQLInlineCast).value;
        depth++;
      }

      expect((currentNode as ESQLSingleAstItem).name).toBe('field');
    });
  });
});
