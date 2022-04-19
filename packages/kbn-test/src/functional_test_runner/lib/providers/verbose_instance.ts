/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { ToolingLog } from '@kbn/tooling-log';

function printArgs(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string' || typeof arg === 'number' || arg instanceof Date) {
        return inspect(arg);
      }

      if (Array.isArray(arg)) {
        return `[${printArgs(arg)}]`;
      }

      return Object.prototype.toString.call(arg);
    })
    .join(', ');
}

export function createVerboseInstance(
  log: ToolingLog,
  name: string,
  instance: { [k: string]: any; [i: number]: any }
) {
  if (!log.getWriters().some((l) => (l as any).level.flags.verbose)) {
    return instance;
  }

  return new Proxy(instance, {
    get(_, prop) {
      const value = (instance as any)[prop];

      if (typeof value !== 'function' || prop === 'init' || typeof prop === 'symbol') {
        return value;
      }

      return function (this: any, ...args: any[]) {
        log.verbose(`${name}.${prop}(${printArgs(args)})`);
        log.indent(2);

        let result;
        try {
          result = {
            returned: value.apply(this, args),
          };
        } catch (error) {
          result = {
            returned: undefined,
            thrown: error,
          };
        }

        if (result.hasOwnProperty('thrown')) {
          log.indent(-2);
          throw result.thrown;
        }

        const { returned } = result;
        if (
          returned &&
          typeof returned.then === 'function' &&
          typeof returned.finally === 'function'
        ) {
          return returned.finally(() => {
            log.indent(-2);
          });
        }

        log.indent(-2);
        return returned;
      };
    },
  });
}
