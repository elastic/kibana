/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { getAriaName } from './get_aria_name';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getAriaName(name)', function () {
      it('should return a space delimited lower-case string with no special characters', function () {
        expect(getAriaName('xPack:defaultAdminEmail')).to.be('x pack default admin email');
        expect(getAriaName('doc_table:highlight')).to.be('doc table highlight');
        expect(getAriaName('foo')).to.be('foo');
      });

      it('should return an empty string if passed undefined or null', function () {
        expect(getAriaName()).to.be('');
        expect(getAriaName(undefined)).to.be('');
      });

      it('should preserve category string', function () {
        expect(getAriaName('xPack:fooBar:foo_bar_baz category:(general)')).to.be(
          'x pack foo bar foo bar baz category:(general)'
        );
        expect(getAriaName('xPack:fooBar:foo_bar_baz category:(general or discover)')).to.be(
          'x pack foo bar foo bar baz category:(general or discover)'
        );
      });
    });
  });
});
