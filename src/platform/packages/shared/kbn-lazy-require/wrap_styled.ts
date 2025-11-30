/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This module intercepts @emotion/styled-components calls to ensure lazy requires
 * doesn't cause issues.
 *
 * Both libraries safe-guard against inefficient use of its APIs, by trying to identify
 * if some of its bootstrapping code runs for the first time during a render. With
 * lazy requires enabled, the module is potentially required for the first time during
 * a React render, which results in an error being thrown. This code is only active
 * in non-production builds, so we trick these libraries into thinking they're running
 * as part of a production build.
 *
 * This is only an issue with tests - lazy requires are not enabled in the browser and
 * we do not use these libraries on the server outside of Jest tests.
 */

function mockWithProdEnv<T>(fn: () => T): T {
  const prev = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    return fn();
  } finally {
    process.env.NODE_ENV = prev;
  }
}

/**
 * Proxify a tag function returned by styled.* or styled(tag).
 * Ensures every call (including chained helpers like .attrs / .withConfig) runs under NODE_ENV=production.
 */
function proxifyTag<TFunc extends Function>(tagFn: TFunc): TFunc {
  return new Proxy(tagFn as any, {
    apply(target, thisArg, argArray) {
      return mockWithProdEnv(() => Reflect.apply(target, thisArg, argArray));
    },
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // If the property is a function (e.g., .attrs, .withConfig), wrap its result again.
      if (typeof value === 'function') {
        return (...args: any[]) => {
          const out = value.apply(target, args);
          // If it returns another tag function (common for .attrs/.withConfig), re-proxify it.
          return typeof out === 'function' ? proxifyTag(out) : out;
        };
      }

      return value;
    },
  });
}

/**
 * Wrap a styled factory so that:
 *  - styled(tag) returns a proxied tag function
 *  - styled.div (and all HTML helpers) return proxied tag functions
 */
function mockWrapStyled<TStyled extends object>(realStyled: TStyled): TStyled {
  return new Proxy(realStyled as any, {
    // styled('div')(...)
    apply(target, thisArg, argArray) {
      const tag = Reflect.apply(target, thisArg, argArray);
      return typeof tag === 'function' ? proxifyTag(tag) : tag;
    },
    // styled.div`...`, styled.span`...`, plus any dynamic helper properties
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // A lot of styled helpers are functions (tagged templates),
      // so we transparently wrap them.
      if (typeof value === 'function') {
        return proxifyTag(value);
      }

      return value;
    },
  });
}

jest.mock('@emotion/styled', () => {
  // Use the real module, then only replace the default export with our wrapped one.
  const real = jest.requireActual('@emotion/styled');

  // Some builds expose default under `default`, others directly.
  const realDefault = real.default || real;

  const wrappedDefault = mockWrapStyled(realDefault);

  return {
    __esModule: true,
    ...real,
    default: wrappedDefault,
  };
});

jest.mock('styled-components', () => {
  const real = jest.requireActual('styled-components');
  const realDefault = real.default || real;
  const wrappedDefault = mockWrapStyled(realDefault);

  return {
    __esModule: true,
    ...real,
    default: wrappedDefault,
    createGlobalStyle: (...args: any[]) => mockWithProdEnv(() => real.createGlobalStyle(...args)),
  };
});
