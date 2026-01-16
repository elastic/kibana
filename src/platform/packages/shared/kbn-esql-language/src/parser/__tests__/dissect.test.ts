/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import { Walker } from '../../ast/walker';

describe('DISSECT', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        ROW a = "2023-01-23T12:15:00.000Z - some text - 127.0.0.1"
        | DISSECT a """%{date} - %{msg} - %{ip}"""
        | KEEP date, msg, ip`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const dissect = Walker.match(ast, { type: 'command', name: 'dissect' });

      expect(errors.length).toBe(0);
      expect(dissect).toMatchObject({
        type: 'command',
        name: 'dissect',
        args: [{}, {}],
      });
    });
  });
});
