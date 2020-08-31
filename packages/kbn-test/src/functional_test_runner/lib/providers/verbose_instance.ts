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

import { inspect } from 'util';

import { ToolingLog } from '@kbn/dev-utils';

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
        if (returned && typeof returned.then === 'function') {
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
