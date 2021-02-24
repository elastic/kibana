/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';

type SomeFn = (...args: any[]) => unknown;

const isPromise = (val: any): val is Promise<unknown> => {
  return (
    typeof val === 'object' &&
    val &&
    typeof val.then === 'function' &&
    typeof val.finally === 'function'
  );
};

const isObj = (value: any): value is object => {
  return typeof value === 'object' && value;
};

export const createApmInstrumentedInstance = <T extends object>(
  instance: T,
  type: string,
  instanceName: string
) => {
  const fnWrappers = new WeakMap<SomeFn, SomeFn>();
  const objWrappers = new WeakMap<object, object>();

  const createFnWrapper = (path: string, context: object, fn: SomeFn): SomeFn => {
    return (...args: any[]) => {
      const span = apm.startSpan(`${instanceName}.${path}()`, type, instanceName, path);

      if (!span) {
        return fn.apply(context, args);
      }

      try {
        let value = fn.apply(context, args);

        if (isPromise(value)) {
          value = value.then(
            (v) => {
              span.setOutcome('success');
              span.end();
              return v;
            },
            (error) => {
              span.setOutcome('failure');
              span.end();
              throw error;
            }
          );
        } else {
          span.setOutcome('success');
          span.end();
        }

        return value;
      } catch (error) {
        span.setOutcome('failure');
        span.end();

        throw error;
      }
    };
  };

  const createObjectWrapper = (path: string, object: object): object => {
    return new Proxy(object, {
      get(_, property: keyof T, receiver) {
        const value = Reflect.get(object, property, receiver);

        // don't wrap symbol properties
        if (typeof property !== 'string') {
          return value;
        }

        const subPath = path ? `${path}.${property}` : `${property}`;

        // wrap function properties
        if (typeof value === 'function') {
          const cached = fnWrappers.get(value);
          if (cached) {
            return cached;
          }

          const wrapper = createFnWrapper(subPath, object, value);
          fnWrappers.set(value, wrapper);
          return wrapper;
        }

        // deeply wrap object properties
        if (isObj(value)) {
          const cached = objWrappers.get(value);
          if (cached) {
            return cached;
          }

          const wrapper = createObjectWrapper(subPath, value);
          objWrappers.set(value, wrapper);
          return wrapper;
        }

        return value;
      },
    });
  };

  return createObjectWrapper('', instance) as T;
};
