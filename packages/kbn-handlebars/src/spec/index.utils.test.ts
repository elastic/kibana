/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars from '../..';
import { expectTemplate } from '../__jest__/test_bench';

describe('utils', function () {
  describe('#SafeString', function () {
    it('constructing a safestring from a string and checking its type', function () {
      const safe = new Handlebars.SafeString('testing 1, 2, 3');
      expect(safe).toBeInstanceOf(Handlebars.SafeString);
      expect(safe.toString()).toEqual('testing 1, 2, 3');
    });

    it('it should not escape SafeString properties', function () {
      const name = new Handlebars.SafeString('<em>Sean O&#x27;Malley</em>');
      expectTemplate('{{name}}').withInput({ name }).toCompileTo('<em>Sean O&#x27;Malley</em>');
    });
  });
});
