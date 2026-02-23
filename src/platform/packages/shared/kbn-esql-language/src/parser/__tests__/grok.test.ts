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

describe('GROK', () => {
  describe('correctly formatted', () => {
    it('parses basic example from documentation', () => {
      const src = `
        ROW a = "2023-01-23T12:15:00.000Z 127.0.0.1 some.email@foo.com 42"
            | GROK a """%{TIMESTAMP_ISO8601:date} %{IP:ip} %{EMAILADDRESS:email} %{NUMBER:num}"""
            | KEEP date, ip, email, num`;
      const { ast, errors } = EsqlQuery.fromSrc(src);
      const grok = Walker.match(ast, { type: 'command', name: 'grok' });

      expect(errors.length).toBe(0);
      expect(grok).toMatchObject({
        type: 'command',
        name: 'grok',
        args: [{}, {}],
      });
    });
  });

  it('parses command with multiple patterns', () => {
    const src = `
FROM logs
| GROK message "%{IP:client_ip}", "%{WORD:method}", "%{NUMBER:status}"`;
    const { ast, errors } = EsqlQuery.fromSrc(src);
    const grok = Walker.match(ast, { type: 'command', name: 'grok' });

    expect(errors.length).toBe(0);
    expect(grok).toMatchObject({
      type: 'command',
      name: 'grok',
      args: [
        { type: 'column', name: 'message' },
        { type: 'literal', literalType: 'keyword' },
        { type: 'literal', literalType: 'keyword' },
        { type: 'literal', literalType: 'keyword' },
      ],
    });
  });
});
