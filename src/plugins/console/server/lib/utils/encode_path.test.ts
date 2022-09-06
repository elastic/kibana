/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { encodePath } from './encode_path';

describe('encodePath', () => {
  const tests = [
    {
      description: 'encodes invalid URL characters',
      source: '/%{[@metadata][beat]}-%{[@metadata][version]}-2020.08.23',
      assert:
        '/%25%7B%5B%40metadata%5D%5Bbeat%5D%7D-%25%7B%5B%40metadata%5D%5Bversion%5D%7D-2020.08.23',
    },
    {
      description: 'ignores encoded characters',
      source: '/my-index/_doc/this%2Fis%2Fa%2Fdoc',
      assert: '/my-index/_doc/this%2Fis%2Fa%2Fdoc',
    },
    {
      description: 'ignores slashes between',
      source: '_index/test/.test',
      assert: '_index/test/.test',
    },
  ];

  tests.forEach(({ description, source, assert }) => {
    test(description, () => {
      const result = encodePath(source);
      expect(result).toEqual(assert);
    });
  });
});
