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

/* @notice
 * This product includes code that is based on facebookincubator/idx, which was
 * available under a "MIT" license.
 *
 * MIT License
 *
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict'; // eslint-disable-line strict

jest.autoMockOff();

const { transformSync: babelTransform } = require('@babel/core');
const babelPluginIdx = require('./index');
const transformAsyncToGenerator = require('@babel/plugin-transform-async-to-generator');
const vm = require('vm');

function transform(source, plugins, options) {
  return babelTransform(source, {
    plugins: plugins || [[babelPluginIdx, options]],
    babelrc: false,
    highlightCode: false,
  }).code;
}

const asyncToGeneratorHelperCode = `
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}

function _asyncToGenerator(fn) {
    return function() {
        var self = this,
            args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);

            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }

            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
`;

function stringByTrimmingSpaces(string) {
  return string.replace(/\s+/g, '');
}

expect.extend({
  toTransformInto: (input, expected) => {
    const plugins = typeof input === 'string' ? null : input.plugins;
    const options = typeof input === 'string' ? undefined : input.options;
    const code = typeof input === 'string' ? input : input.code;
    const actual = transform(code, plugins, options);
    const pass = stringByTrimmingSpaces(actual) === stringByTrimmingSpaces(expected);
    return {
      pass,
      message: () =>
        'Expected input to transform into:\n' + expected + '\n' + 'Instead, got:\n' + actual,
    };
  },
  toThrowTransformError: (input, expected) => {
    try {
      const plugins = typeof input === 'string' ? null : input.plugins;
      const options = typeof input === 'string' ? undefined : input.options;
      const code = typeof input === 'string' ? input : input.code;
      transform(code, plugins, options);
    } catch (error) {
      const actual = /^.+:\s*(.*)/.exec(error.message)[1]; // Strip "undefined: " and code snippet
      return {
        pass: actual === expected,
        message: () =>
          'Expected transform to throw "' + expected + '", but instead ' + 'got "' + actual + '".',
      };
    }
    return {
      pass: false,
      message: () => 'Expected transform to throw "' + expected + '".',
    };
  },
  toReturn: (input, expected) => {
    const code = transform(input, undefined);
    const actual = vm.runInNewContext(code);
    return {
      pass: actual === expected,
      message: () => 'Expected "' + expected + '" but got "' + actual + '".',
    };
  },
});

describe('kbn-babel-plugin-apm-idx', () => {
  it('transforms member expressions', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _.b.c.d.e);
    `).toTransformInto(`
      base != null && base.b != null && base.b.c != null && base.b.c.d != null
        ? base.b.c.d.e
        : undefined;
    `);
  });

  it('throws on call expressions', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _.b.c(...foo)().d(bar, null, [...baz]));
    `).toThrowTransformError('idx callbacks may only access properties on the callback parameter.');
  });

  it('transforms bracket notation', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _["b"][0][c + d]);
    `).toTransformInto(`
      base != null && base["b"] != null && base["b"][0] != null ? base["b"][0][c + d] : undefined;
    `);
  });

  it('throws on bracket notation call expressions', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _["b"](...foo)()[0][c + d](bar, null, [...baz]));
    `).toThrowTransformError('idx callbacks may only access properties on the callback parameter.');
  });

  it('transforms combination of both member access notations', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _.a["b"].c[d[e[f]]].g);
    `).toTransformInto(`
      base != null && base.a != null && base.a["b"] != null && base.a["b"].c != null && base.a["b"].c[d[e[f]]] != null
        ? base.a["b"].c[d[e[f]]].g
        : undefined;
    `);
  });

  it('transforms if the base is an expression', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(this.props.base[5], _ => _.property);
    `).toTransformInto(`
      this.props.base[5] != null ? this.props.base[5].property : undefined;
    `);
  });

  it('throws if the arrow function has more than one param', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, (a, b) => _.property);
    `).toThrowTransformError(
      'The arrow function supplied to `idx` must take exactly one parameter.'
    );
  });

  it('throws if the arrow function has an invalid base', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, a => b.property)
    `).toThrowTransformError(
      'The parameter of the arrow function supplied to `idx` must match the ' +
        'base of the body expression.'
    );
  });

  it('throws if the arrow function expression has non-properties/methods', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => (_.a++).b.c);
    `).toThrowTransformError('idx callbacks may only access properties on the callback parameter.');
  });

  it('throws if the body of the arrow function is not an expression', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => {})
    `).toThrowTransformError(
      'The body of the arrow function supplied to `idx` must be a single ' +
        'expression (without curly braces).'
    );
  });

  it('ignores non-function call idx', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      result = idx;
    `).toTransformInto(`
      import { idx } from '@kbn/elastic-idx';
      result = idx;
    `);
  });

  it('throws if idx is called with zero arguments', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx();
    `).toThrowTransformError('The `idx` function takes exactly two arguments.');
  });

  it('throws if idx is called with one argument', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(1);
    `).toThrowTransformError('The `idx` function takes exactly two arguments.');
  });

  it('throws if idx is called with three arguments', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(1, 2, 3);
    `).toThrowTransformError('The `idx` function takes exactly two arguments.');
  });

  it('transforms idx calls as part of another expressions', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      paddingStatement();
      a = idx(base, _ => _.b[c]);
    `).toTransformInto(`
      paddingStatement();
      a = base != null && base.b != null ? base.b[c] : undefined;
    `);
  });

  it('transforms nested idx calls', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(
        idx(
          idx(base, _ => _.a.b),
          _ => _.c.d
        ),
        _ => _.e.f
      );
    `).toTransformInto(`
      (
          (base != null && base.a != null ? base.a.b : undefined) != null &&
          (base != null && base.a != null ? base.a.b : undefined).c != null ?
          (base != null && base.a != null ? base.a.b : undefined).c.d :
          undefined
      ) != null
          &&
          (
              (base != null && base.a != null ? base.a.b : undefined) != null &&
              (base != null && base.a != null ? base.a.b : undefined).c != null ?
              (base != null && base.a != null ? base.a.b : undefined).c.d :
              undefined
          ).e != null ?
          (
              (base != null && base.a != null ? base.a.b : undefined) != null &&
              (base != null && base.a != null ? base.a.b : undefined).c != null ?
              (base != null && base.a != null ? base.a.b : undefined).c.d :
              undefined
          ).e.f :
          undefined;
    `);
  });

  it('transforms idx calls inside async functions (plugin order #1)', () => {
    expect({
      plugins: [babelPluginIdx, transformAsyncToGenerator],
      code: `
        import { idx } from '@kbn/elastic-idx';
        async function f() {
          idx(base, _ => _.b.c.d.e);
        }
      `,
    }).toTransformInto(`
      ${asyncToGeneratorHelperCode}
      function f() {
        return _f.apply(this, arguments);
      }

      function _f() {
        _f = _asyncToGenerator(function* () {
          base != null && base.b != null && base.b.c != null && base.b.c.d != null ? base.b.c.d.e : undefined;
        });
        return _f.apply(this, arguments);
      }
    `);
  });

  it('transforms idx calls inside async functions (plugin order #2)', () => {
    expect({
      plugins: [transformAsyncToGenerator, babelPluginIdx],
      code: `
        import { idx } from '@kbn/elastic-idx';
        async function f() {
          idx(base, _ => _.b.c.d.e);
        }
      `,
    }).toTransformInto(`
      ${asyncToGeneratorHelperCode}

      function f() {
        return _f.apply(this, arguments);
      }

      function _f() {
        _f = _asyncToGenerator(function* () {
          base != null && base.b != null && base.b.c != null && base.b.c.d != null ? base.b.c.d.e : undefined;
        });
        return _f.apply(this, arguments);
      }
    `);
  });

  it('transforms idx calls in async methods', () => {
    expect({
      plugins: [transformAsyncToGenerator, babelPluginIdx],
      code: `
        import { idx } from '@kbn/elastic-idx';
        class Foo {
          async bar() {
            idx(base, _ => _.b);
            return this;
          }
        }
      `,
    }).toTransformInto(`
      ${asyncToGeneratorHelperCode}

      class Foo {
        bar() {
          var _this = this;

          return _asyncToGenerator(function* () {
            base != null ? base.b : undefined;
            return _this;
          })();
        }
      }
    `);
  });

  it('transforms idx calls when an idx import binding is in scope', () => {
    expect(`
      import idx from '@kbn/elastic-idx';
      idx(base, _ => _.b);
    `).toTransformInto(`
      base != null ? base.b : undefined;
    `);
  });

  it('transforms idx calls when an idx const binding is in scope', () => {
    expect(`
      const idx = require('@kbn/elastic-idx');
      idx(base, _ => _.b);
    `).toTransformInto(`
      base != null ? base.b : undefined;
    `);
  });

  it('transforms deep idx calls when an idx import binding is in scope', () => {
    expect(`
      import idx from '@kbn/elastic-idx';
      function f() {
        idx(base, _ => _.b);
      }
    `).toTransformInto(`
      function f() {
        base != null ? base.b : undefined;
      }
    `);
  });

  it('transforms deep idx calls when an idx const binding is in scope', () => {
    expect(`
      const idx = require('@kbn/elastic-idx');
      function f() {
        idx(base, _ => _.b);
      }
    `).toTransformInto(`
      function f() {
        base != null ? base.b : undefined;
      }
    `);
  });

  it('transforms idx calls when an idx is called as a member function on the binding in scope', () => {
    expect(`
      const elastic_idx = require("@kbn/elastic-idx");
      const result = elastic_idx.idx(base, _ => _.a.b.c.d);
    `).toTransformInto(`
      const result = base != null &&
        base.a != null &&
        base.a.b != null &&
        base.a.b.c != null ?
        base.a.b.c.d :
        undefined;
    `);
  });

  it('throws on base call expressions', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _().b.c);
    `).toThrowTransformError('idx callbacks may only access properties on the callback parameter.');
  });

  it('transforms when the idx parent is a scope creating expression', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      (() => idx(base, _ => _.b));
    `).toTransformInto(`
      () => base != null ? base.b : undefined;
    `);
  });

  it('throws if redefined before use', () => {
    expect(`
      let idx = require('@kbn/elastic-idx');
      idx = null;
      idx(base, _ => _.b);
    `).toThrowTransformError('`idx` cannot be redefined.');
  });

  it('throws if redefined after use', () => {
    expect(`
      let idx = require('@kbn/elastic-idx');
      idx(base, _ => _.b);
      idx = null;
    `).toThrowTransformError('`idx` cannot be redefined.');
  });

  it('throws if there is a duplicate declaration', () => {
    expect(() =>
      transform(`
      let idx = require('@kbn/elastic-idx');
      idx(base, _ => _.b);
      function idx() {}
    `)
    ).toThrow();
  });

  it('handles sibling scopes with unique idx', () => {
    expect(`
      function aaa() {
        const idx = require('@kbn/elastic-idx');
        idx(base, _ => _.b);
      }
      function bbb() {
        const idx = require('@kbn/elastic-idx');
        idx(base, _ => _.b);
      }
    `).toTransformInto(`
      function aaa() {
        base != null ? base.b : undefined;
      }
      function bbb() {
        base != null ? base.b : undefined;
      }
    `);
  });

  it('handles sibling scopes with and without idx', () => {
    expect(`
      function aaa() {
        const idx = require('@kbn/elastic-idx');
        idx(base, _ => _.b);
      }
      function bbb() {
        idx(base, _ => _.b);
      }
    `).toTransformInto(`
      function aaa() {
        base != null ? base.b : undefined;
      }
      function bbb() {
        idx(base, _ => _.b);
      }
    `);
  });

  it('handles nested scopes with shadowing', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _.b);
      function aaa() {
        idx(base, _ => _.b);
        function bbb(idx) {
          idx(base, _ => _.b);
        }
      }
    `).toTransformInto(`
      base != null ? base.b : undefined;
      function aaa() {
        base != null ? base.b : undefined;
        function bbb(idx) {
          idx(base, _ => _.b);
        }
      }
    `);
  });

  it('handles named idx import', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
      idx(base, _ => _.b);
    `).toTransformInto(`
      base != null ? base.b : undefined;
    `);
  });

  it('throws on default plus named import', () => {
    expect(`
      import idx, {foo} from '@kbn/elastic-idx';
      idx(base, _ => _.b);
    `).toThrowTransformError('The idx import must be a single specifier.');
  });

  it('throws on default plus namespace import', () => {
    expect(`
      import idx, * as foo from '@kbn/elastic-idx';
      idx(base, _ => _.b);
    `).toThrowTransformError('The idx import must be a single specifier.');
  });

  it('throws on named default plus other import', () => {
    expect(`
      import {default as idx, foo} from '@kbn/elastic-idx';
      idx(base, _ => _.b);
    `).toThrowTransformError('The idx import must be a single specifier.');
  });

  it('unused idx import should be left alone', () => {
    expect(`
      import { idx } from '@kbn/elastic-idx';
    `).toTransformInto(`
      import { idx } from '@kbn/elastic-idx';
    `);
  });

  it('allows configuration of the import name', () => {
    expect({
      code: `
        import { idx } from 'i_d_x';
        idx(base, _ => _.b);
      `,
      options: { importName: 'i_d_x' },
    }).toTransformInto(`
      base != null ? base.b : undefined;
    `);
  });

  it('follows configuration of the import name', () => {
    expect({
      code: `
        import { idx } from '@kbn/elastic-idx';
        import { idx as i_d_x } from 'i_d_x';
        i_d_x(base, _ => _.b);
        idx(base, _ => _.c);
      `,
      options: { importName: 'i_d_x' },
    }).toTransformInto(`
      import { idx } from '@kbn/elastic-idx';

      base != null ? base.b : undefined;
      idx(base, _ => _.c);
    `);
  });

  it('allows configuration of the require name as a string', () => {
    expect({
      code: `
        import { idx } from 'i_d_x';
        idx(base, _ => _.b);
      `,
      options: { importName: 'i_d_x' },
    }).toTransformInto(`
      base != null ? base.b : undefined;
    `);
  });

  it('allows configuration of the require name as a RegExp', () => {
    expect({
      code: `
        import { idx } from '../../common/idx';
        idx(base, _ => _.b);
      `,
      options: { importName: /.*idx$/ },
    }).toTransformInto(`
      base != null ? base.b : undefined;
    `);
  });

  it('follows configuration of the require name', () => {
    expect({
      code: `
        const idx = require('@kbn/elastic-idx');
        const i_d_x = require('i_d_x');
        i_d_x(base, _ => _.b);
        idx(base, _ => _.c);
      `,
      options: { importName: 'i_d_x' },
    }).toTransformInto(`
      const idx = require('@kbn/elastic-idx');

      base != null ? base.b : undefined;
      idx(base, _ => _.c);
    `);
  });

  describe('functional', () => {
    it('works with only properties', () => {
      expect(`
        import { idx } from '@kbn/elastic-idx';
        const base = {a: {b: {c: 2}}};
        idx(base, _ => _.a.b.c);
      `).toReturn(2);
    });

    it('works with missing properties', () => {
      expect(`
        import { idx } from '@kbn/elastic-idx';
        const base = {a: {b: {}}};
        idx(base, _ => _.a.b.c);
      `).toReturn(undefined);
    });

    it('works with null properties', () => {
      expect(`
        import { idx } from '@kbn/elastic-idx';
        const base = {a: {b: null}};
        idx(base, _ => _.a.b.c);
      `).toReturn(undefined);
    });

    it('works with nested idx calls', () => {
      expect(`
        import { idx } from '@kbn/elastic-idx';
        const base = {a: {b: {c: {d: {e: {f: 2}}}}}};
        idx(
          idx(
            idx(base, _ => _.a.b),
            _ => _.c.d
          ),
          _ => _.e.f
        );
      `).toReturn(2);
    });

    it('works with nested idx calls with missing properties', () => {
      expect(`
        import { idx } from '@kbn/elastic-idx';
        const base = {a: {b: {c: null}}};
        idx(
          idx(
            idx(base, _ => _.a.b),
            _ => _.c.d
          ),
          _ => _.e.f
        );
      `).toReturn(undefined);
    });
  });
});
