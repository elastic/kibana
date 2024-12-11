/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @internal */
export interface ConsoleMessagesStartDeps {
  isDev: boolean;
  mode: 'warn' | 'error' | false;
  onWarn?: (title: string, text: string) => void;
  onError?: (title: string, text: string) => void;
}

const noop = () => {};
const consoleMethods = ['warn', 'error'] as const;
const consolePlaceholders = ['s', 'd', 'i', 'f', 'o'] as const;
const placeholderRegex = new RegExp(`%([${consolePlaceholders.join('')}])(?![a-z])`, 'g');
type ConsoleMethod = (typeof consoleMethods)[number];
type ConsolePlaceholder = (typeof consolePlaceholders)[number];

export class ConsoleMessagesService {
  public setup() {}

  public start({ isDev, mode, onError = noop, onWarn = noop }: ConsoleMessagesStartDeps) {
    if (!isDev || !mode) {
      return;
    }

    const console = window.console;

    if (!console) {
      return;
    }

    const intercept = (method: ConsoleMethod) => {
      const original = console[method];

      console[method] = function (...args) {
        original.apply(console, args);

        let message = args.shift() + '';

        if (args.length) {
          // Drop the stacktrace.
          args.pop();

          // Console methods use string subsitutions, so this implements that functionality
          message = message.replace(placeholderRegex, (_s, param) => {
            let arg;

            if (!args.length) {
              return '';
            }

            arg = args.shift();

            switch (param as ConsolePlaceholder) {
              case 'd':
              case 'i':
                arg = typeof arg === 'boolean' ? (arg ? 1 : 0) : parseInt(arg, 10);
                return isNaN(arg) ? '0' : arg + '';
              case 'f':
                arg = typeof arg === 'boolean' ? (arg ? 1 : 0) : parseFloat(arg);
                return isNaN(arg) ? '0.000000' : arg.toFixed(6) + '';
              case 'o': // might consider `JSON.stringify(arg, null, 2)`
              case 's':
              default:
                return arg + '';
            }
          });

          if (message) {
            args.unshift(message);
          }

          message = args.join(' ').replace(/\s*$/, ' ');
        }

        // Only post a toast if it's an error or warning.
        if (method === 'error') {
          onError('Error in console (dev only)', message);
        } else if (method === 'warn') {
          onWarn('Warning in console (dev only)', message);
        }
      };

      // @ts-expect-error
      console[method].__KIBANA_CONSOLE_REPLACED__ = true;
      // @ts-expect-error
      console[method].__KIBANA_ORIGINAL_METHOD__ = original;
    };

    if (mode === 'warn' || mode === 'error') {
      intercept('error');
    }

    if (mode === 'warn') {
      intercept('warn');
    }

    return {};
  }
}
