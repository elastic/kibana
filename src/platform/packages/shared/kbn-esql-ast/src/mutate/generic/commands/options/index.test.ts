/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../../../parser';
import { BasicPrettyPrinter } from '../../../../pretty_print';
import * as generic from '../..';

describe('generic.commands.options', () => {
  describe('.findByName()', () => {
    it('can the find a command option', () => {
      const src = 'FROM index METADATA _score';
      const { root } = parse(src);
      const option = generic.commands.options.findByName(root, 'from', 'metadata');

      expect(option).toMatchObject({
        type: 'option',
        name: 'metadata',
      });
    });

    it('returns undefined if there is no option', () => {
      const src = 'FROM index';
      const { root } = parse(src);
      const option = generic.commands.options.findByName(root, 'from', 'metadata');

      expect(option).toBe(undefined);
    });
  });

  describe('.remove()', () => {
    it('can remove existing command option', () => {
      const src = 'FROM index METADATA _score';
      const { root } = parse(src);
      const option = generic.commands.options.findByName(root, 'from', 'metadata');

      generic.commands.options.remove(root, option!);

      const src2 = BasicPrettyPrinter.print(root);

      expect(src2).toBe('FROM index');
    });
  });
});
