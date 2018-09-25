/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';
import { replace } from '../replace';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('replace', () => {
  const fn = functionWrapper(replace);

  it('replaces text that matches the pattern', () => {
    expect(
      fn('A string with vowels', {
        pattern: '[aeiou]',
        flags: 'gi',
        replacement: '*',
      })
    ).to.be('* str*ng w*th v*w*ls');
  });

  it('supports capture groups in the pattern', () => {
    expect(fn('abcABCabcABC', { pattern: '(a)(b)(c)', flags: 'ig', replacement: '$1-$2 ' })).to.be(
      'a-b A-B a-b A-B '
    );

    expect(
      fn('500.948.0888, 589-786-3621, (887) 486 5577, 123 456 7890', {
        pattern: '\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})',
        flags: 'g',
        replacement: '($1)$2-$3',
      })
    ).to.be('(500)948-0888, (589)786-3621, (887)486-5577, (123)456-7890');
  });

  describe('args', () => {
    describe('pattern', () => {
      it('sets the pattern for RegEx', () => {
        expect(
          fn('\t\t\t\tfoo\rbar\n\rfizz\n\r\nbuzz\r\n\n', {
            pattern: '\\s+',
            flag: 'g',
            replacement: ',',
          })
        ).to.be(',foo,bar,fizz,buzz,');
      });

      it('adds the replacement between every character if not specified (default behavior of String.replace)', () => {
        expect(fn('140000', { flags: 'g', replacement: 'X' })).to.be('X1X4X0X0X0X0X');
        expect(fn('140000', { flags: 'g', replacement: 'foo' })).to.be(
          'foo1foo4foo0foo0foo0foo0foo'
        );
      });
    });

    describe('flags', () => {
      it('sets the flags for RegEx', () => {
        expect(fn('AaBbAaBb', { pattern: 'a', flags: 'ig', replacement: '_' })).to.be('__Bb__Bb');
        expect(fn('AaBbAaBb', { pattern: 'a', flags: 'i', replacement: '_' })).to.be('_aBbAaBb');
        expect(fn('AaBbAaBb', { pattern: 'a', flags: '', replacement: '_' })).to.be('A_BbAaBb');
      });

      it('defaults to \'g\' if flag is not provided', () => {
        expect(fn('This,is,a,test!', { pattern: ',', replacement: ' ' })).to.be('This is a test!');
      });
    });

    describe('replacement', () => {
      it('sets the replacement string for all RegEx matches', () => {
        expect(fn('140000', { pattern: '0', replacement: '1' })).to.be('141111');
      });
      // TODO: put test back when using interpreter
      // it('removes matches to regex if replacement is not provided', () => {
      //   expect(fn('140000', { pattern: '0' })).to.be('14');
      // });
    });
  });
});
