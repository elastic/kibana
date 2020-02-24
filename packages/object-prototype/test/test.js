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

/* eslint-disable no-prototype-builtins, no-proto */

const test = require('tape');
const debug = require('debug')('tests');
const functions = require('object-prototype-functions').nodejs;
const { sloppy, strict } = require('./functions');
const {
  create,
  assign,
  ObjectPrototype,
  FunctionPrototype,
  safePrototypeFunction,
} = require('../');

test('isSloppy', function(t) {
  t.equal(isSloppy(sloppy), true);
  t.equal(isSloppy(strict), false);
  t.end();
});

test('doesObjectLeak', function(t) {
  t.ok(doesObjectLeak(function() {}));
  t.ok(doesObjectLeak(() => {}));
  t.ok(doesObjectLeak({}));
  t.ok(doesObjectLeak(Object));
  t.ok(doesObjectLeak(Function));
  t.ok(doesObjectLeak(Object.prototype));
  t.ok(doesObjectLeak(Function.prototype));
  t.notOk(doesObjectLeak(Object.create(null)));
  t.end();
});

test('safePrototypeFunction maintains strictness', function(t) {
  t.equal(isSloppy(safePrototypeFunction(sloppy)), true);
  t.equal(isSloppy(safePrototypeFunction(strict)), false);
  t.end();
});

test("safePrototypeFunction doesn't leak", function(t) {
  const fn = safePrototypeFunction(function() {});
  assertNoLeak(t, fn);
  t.end();
});

test('FunctionPrototype.__proto__', function(t) {
  t.equal(FunctionPrototype.__proto__, ObjectPrototype);
  t.end();
});

test('FunctionPrototype.length', function(t) {
  t.equal(Function.prototype.length, 0);
  t.equal(FunctionPrototype.length, 0);

  t.equal((() => {}).length, 0);
  t.equal(((a, b) => {}).length, 2); // eslint-disable-line no-unused-vars
  t.equal(function() {}.length, 0);
  t.equal(function(a, b) {}.length, 2); // eslint-disable-line no-unused-vars

  t.equal(safePrototypeFunction(() => {}).length, 0);
  t.equal(safePrototypeFunction((a, b) => {}).length, 2); // eslint-disable-line no-unused-vars
  t.equal(safePrototypeFunction(function() {}).length, 0);
  t.equal(safePrototypeFunction(function(a, b) {}).length, 2); // eslint-disable-line no-unused-vars

  t.end();
});

test('FunctionPrototype.name', function(t) {
  t.equal(Function.prototype.name, '');
  t.equal(FunctionPrototype.name, '');

  t.equal((() => {}).name, '');
  t.equal(function() {}.name, '');
  t.equal(function foo() {}.name, 'foo');

  t.equal(safePrototypeFunction(() => {}).name, '');
  t.equal(safePrototypeFunction(function() {}).name, '');
  t.equal(safePrototypeFunction(function foo() {}).name, 'foo');

  t.end();
});

test('Object.getPrototypeOf(FunctionPrototype)', function(t) {
  t.equal(Object.getPrototypeOf(FunctionPrototype), ObjectPrototype);
  t.end();
});

test('FunctionPrototype.constructor', function(t) {
  t.equal(FunctionPrototype.constructor, undefined);
  t.end();
});

test("FunctionPrototype doesn't leak", function(t) {
  assertNoLeak(t, FunctionPrototype);

  const fn = function() {};
  Object.setPrototypeOf(fn, FunctionPrototype);
  fn.prototype.__proto__ = FunctionPrototype;

  assertNoLeak(t, fn);
  t.end();
});

test("FunctionPrototype functions doesn't leak", function(t) {
  const descriptors = Object.getOwnPropertyDescriptors(FunctionPrototype);
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (typeof descriptor.value === 'function') {
      assertNoLeak(t, descriptor.value, name);
    } else if (typeof descriptor.get === 'function') {
      assertNoLeak(t, descriptor.get, `${name} getter`);
      assertNoLeak(t, descriptor.set, `${name} setter`);
    }
  }
  t.end();
});

test("ObjectPrototype functions doesn't leak", function(t) {
  const descriptors = Object.getOwnPropertyDescriptors(ObjectPrototype);
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (typeof descriptor.value === 'function') {
      assertNoLeak(t, descriptor.value, name);
    } else if (typeof descriptor.get === 'function') {
      assertNoLeak(t, descriptor.get, `${name} getter`);
      assertNoLeak(t, descriptor.set, `${name} setter`);
    }
  }
  t.end();
});

test('ObjectPrototype.__proto__', function(t) {
  t.equal(ObjectPrototype.__proto__, null);
  t.end();
});

test('Object.getPrototypeOf(ObjectPrototype)', function(t) {
  t.equal(Object.getPrototypeOf(ObjectPrototype), null);
  t.end();
});

test('ObjectPrototype.constructor', function(t) {
  t.equal(ObjectPrototype.constructor, undefined);
  t.end();
});

const generators = [create, assign, () => Object.create(ObjectPrototype)];

generators.forEach(generator => {
  test("functions doesn't leak", function(t) {
    const obj = generator();
    for (const name of functions) {
      assertNoLeak(t, obj[name], name);
      assertNoLeak(t, obj[name].constructor, `${name}.constructor`);
      assertNoLeak(t, obj[name].bind, `${name}.bind`);
      assertNoLeak(t, obj[name].apply, `${name}.apply`);
      assertNoLeak(t, obj[name].call, `${name}.call`);
      assertNoLeak(t, obj[name].toString, `${name}.toString`);
    }
    t.end();
  });

  test('inheritance', function(t) {
    assertNoLeak(t, Object.create(generator()));
    t.end();
  });

  test('Object.getPrototypeOf', function(t) {
    const obj = generator();
    t.equal(Object.getPrototypeOf(obj), ObjectPrototype);
    t.end();
  });

  test('__proto__', function(t) {
    const obj = generator();
    t.equal(obj.__proto__, ObjectPrototype);
    t.end();
  });

  test('__proto__ =', function(t) {
    const obj = generator();
    const someObj = {};
    obj.__proto__ = someObj;
    t.equal(obj.__proto__, someObj);
    t.equal(Object.getPrototypeOf(obj), someObj);
    t.end();
  });

  test('__proto__.__proto__', function(t) {
    const obj = generator();
    t.equal(obj.__proto__.__proto__, null);
    t.end();
  });

  test('constructor', function(t) {
    const obj = generator();
    t.equal(obj.constructor, undefined);
    t.end();
  });

  test('hasOwnProperty', function(t) {
    const obj1 = generator();
    const obj2 = Object.create(obj1);

    obj1.foo = 42;

    assertExecution(t, 'hasOwnProperty', { obj: obj1, args: ['foo'], expected: true });
    assertExecution(t, 'hasOwnProperty', { obj: obj1, args: ['bar'], expected: false });
    assertExecution(t, 'hasOwnProperty', { obj: obj1, args: ['hasOwnProperty'], expected: false });

    assertExecution(t, 'hasOwnProperty', { obj: obj2, args: ['foo'], expected: false });
    assertExecution(t, 'hasOwnProperty', { obj: obj2, args: ['hasOwnProperty'], expected: false });

    assertNonExecutingFunctionPrototypeFunctions(t, 'hasOwnProperty', { obj: obj1 });
    assertNonExecutingFunctionPrototypeFunctions(t, 'hasOwnProperty', { obj: obj2 });

    t.end();
  });

  test('isPrototypeOf', function(t) {
    const obj1 = generator();
    const obj2 = Object.create(obj1);

    t.equal(Object.prototype.isPrototypeOf(ObjectPrototype), false);
    t.equal(Object.prototype.isPrototypeOf(obj1), false);
    t.equal(Object.prototype.isPrototypeOf(obj2), false);

    assertExecution(t, 'isPrototypeOf', { obj: ObjectPrototype, args: [obj1], expected: true });
    assertExecution(t, 'isPrototypeOf', { obj: ObjectPrototype, args: [obj2], expected: true });

    assertExecution(t, 'isPrototypeOf', { obj: obj1, args: [obj2], expected: true });
    assertExecution(t, 'isPrototypeOf', { obj: obj2, args: [obj1], expected: false });

    assertNonExecutingFunctionPrototypeFunctions(t, 'isPrototypeOf', { obj: obj1 });
    assertNonExecutingFunctionPrototypeFunctions(t, 'isPrototypeOf', { obj: obj2 });

    t.end();
  });

  test('propertyIsEnumerable', function(t) {
    const obj = generator();
    Object.defineProperty(obj, 'foo', { enumerable: false });
    Object.defineProperty(obj, 'bar', { enumerable: true });
    assertExecution(t, 'propertyIsEnumerable', { obj, args: ['foo'], expected: false });
    assertExecution(t, 'propertyIsEnumerable', { obj, args: ['bar'], expected: true });
    assertExecution(t, 'propertyIsEnumerable', { obj, args: ['invalid'], expected: false });
    assertNonExecutingFunctionPrototypeFunctions(t, 'propertyIsEnumerable', { obj });
    t.end();
  });

  test('toLocaleString', function(t) {
    const obj = generator();
    assertFunction(t, 'toLocaleString', { obj, expected: obj.toString() });
    t.end();
  });

  test('toString', function(t) {
    assertFunction(t, 'toString', { generator, expected: '[object Object]' });
    t.end();
  });

  test('valueOf', function(t) {
    const obj = generator();
    assertFunction(t, 'valueOf', { obj, expected: obj });
    t.end();
  });

  test('__defineGetter__', function(t) {
    t.plan(16);
    assertFunction(t, '__defineGetter__', {
      generator,
      args: ['foo', () => 'works!'],
      expected: undefined,
      afterCall: obj => {
        t.equal(obj.foo, 'works!', 'should return value when accessing getter property');
      },
    });
  });

  test('__defineSetter__', function(t) {
    t.plan(16);
    assertFunction(t, '__defineSetter__', {
      generator,
      args: ['foo', x => t.equal(x, 'works!', 'should call setter with set value')],
      expected: undefined,
      afterCall: obj => {
        obj.foo = 'works!';
      },
    });
  });

  test('__lookupGetter__', function(t) {
    t.plan(11);

    const obj = generator();
    obj.__defineGetter__('foo', () => 'works!');

    assertFunction(t, '__lookupGetter__', {
      obj,
      args: ['foo'],
      assert: (getter, msg) => t.equal(getter(), 'works!', msg + '()'),
    });
  });

  test('__lookupSetter__', function(t) {
    t.plan(11);

    const obj = generator();
    let msg;

    obj.__defineSetter__('foo', x => {
      t.equal(x, 'works!', msg);
    });

    assertFunction(t, '__lookupSetter__', {
      obj,
      args: ['foo'],
      assert: (setter, _msg) => {
        msg = _msg + '()';
        setter('works!');
      },
    });
  });
});

test('assign', function(t) {
  const obj1 = { a: 1, b: 2 };
  const obj2 = { a: 2, c: 3 };
  const obj3 = assign(obj1, obj2);
  obj1.b = 42;
  obj2.c = 42;
  t.equal(obj3.a, 2);
  t.equal(obj3.b, 2);
  t.equal(obj3.c, 3);
  obj3.a = 42;
  t.equal(obj1.a, 1);
  t.equal(obj2.a, 2);
  t.end();
});

function assertFunction(t, name, opts) {
  assertExecution(t, name, opts);
  assertNonExecutingFunctionPrototypeFunctions(t, name, opts);
}

function assertNonExecutingFunctionPrototypeFunctions(
  t,
  name,
  { obj: _obj, generator = () => _obj }
) {
  const obj = generator();

  t.throws(
    function() {
      obj[name].arguments; // eslint-disable-line no-unused-expressions
    },
    /'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them/,
    `strict: obj.${name}.arguments`
  );
  t.throws(
    function() {
      obj[name].arguments = 42;
    },
    /'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them/,
    `strict: obj.${name}.arguments =`
  );

  t.throws(
    function() {
      obj[name].caller; // eslint-disable-line no-unused-expressions
    },
    /'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them/,
    `strict: obj.${name}.caller`
  );
  t.throws(
    function() {
      obj[name].caller = 42;
    },
    /'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them/,
    `strict: obj.${name}.caller =`
  );

  t.equal(obj[name].toString(obj), {}[name].toString(), `obj.${name}.toString()`);

  assertNoLeak(t, obj[name].bind(obj), `obj.${name}.bind(obj)`);
}

function assertExecution(
  t,
  name,
  {
    obj: _obj,
    generator = () => _obj,
    args = [],
    expected: _expected,
    assert = (result, msg) => t.equal(result, _expected, msg),
    afterCall = () => {},
  }
) {
  const tests = [
    [obj => obj[name](...args), `obj.${name}(...args)`],
    [obj => obj[name].apply(obj, args), `obj.${name}.apply(obj, args)`],
    [obj => obj[name].bind(obj)(...args), `obj.${name}.bind(obj)(...args)`],
    [obj => obj[name].bind(obj, ...args)(), `obj.${name}.bind(obj, ...args)()`],
    [obj => obj[name].call(obj, ...args), `obj.${name}.call(obj, ...args)`], // eslint-disable-line no-useless-call
  ];

  for (const [test, msg] of tests) {
    const obj = generator();
    assert(test(obj), msg);
    afterCall(obj);
  }
}

function assertNoLeak(t, obj, name = '') {
  t.ok(doesObjectLeak(obj) === false, `${name}${name ? ' ' : ''}should not leak Object.prototype`);
}

function doesObjectLeak(obj, seen = new Set(), indent = '') {
  debug(`${indent}obj [root: ${obj === Object.prototype}]:`, obj);

  if (obj === null || obj === undefined) return false;
  if (obj === Object.prototype) return true;

  seen.add(obj);

  debug(
    `${indent}obj.constructor [set: ${!!obj.constructor}, root: ${obj.constructor ===
      Object.prototype}, seen: ${seen.has(obj.constructor)}]`
  );
  if (obj.constructor && !seen.has(obj.constructor)) {
    const result = doesObjectLeak(obj.constructor, seen, indent + '  ');
    if (result === true) return true;
  }
  debug(
    `${indent}obj.prototype [set: ${!!obj.prototype}, root: ${obj.prototype ===
      Object.prototype}, seen: ${seen.has(obj.prototype)}]`
  );
  if (obj.prototype && !seen.has(obj.prototype)) {
    const result = doesObjectLeak(obj.prototype, seen, indent + '  ');
    if (result === true) return true;
  }
  debug(
    `${indent}obj.__proto__ [set: ${!!obj.__proto__}, root: ${obj.__proto__ ===
      Object.prototype}, seen: ${seen.has(obj.__proto__)}]`
  );
  if (obj.__proto__ && !seen.has(obj.__proto__)) {
    const result = doesObjectLeak(obj.__proto__, seen, indent + '  ');
    if (result === true) return true;
  }

  return false;
}

function isSloppy(fn) {
  return Object.prototype.hasOwnProperty.call(fn, 'caller');
}
