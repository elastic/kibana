/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars from '.';
import { expectTemplate } from './__jest__/test_bench';

describe('utils', function () {
  describe('#SafeString', function () {
    it('constructing a safestring from a string and checking its type', function () {
      const safe = new Handlebars.SafeString('testing 1, 2, 3');
      expect(safe).toBeInstanceOf(Handlebars.SafeString);
      expect(safe.toString()).toEqual('testing 1, 2, 3');
    });

    it('it should not escape SafeString properties', function () {
      const name = new Handlebars.SafeString('<em>Sean O&#x27;Malley</em>');

      expectTemplate('{{name}}')
        .withInput({ name: name })
        .toCompileTo('<em>Sean O&#x27;Malley</em>');
    });
  });
});
