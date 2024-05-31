/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ipPrefixToAst } from './ip_prefix_to_ast';

describe('ipPrefixToAst', () => {
  it('should return an expression', () => {
    expect(ipPrefixToAst({ prefixLength: 2, isIpv6: false })).toHaveProperty('type', 'expression');
  });

  it('should forward arguments', () => {
    expect(ipPrefixToAst({ prefixLength: 2, isIpv6: false })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        prefixLength: [2],
        isIpv6: [false],
      })
    );
  });
});
