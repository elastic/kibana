/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isDevMode } from '@kbn/xstate-utils';

/* eslint-disable no-console */

// From https://www.ascii-code.com/characters/control-characters,
// but explicitly allowing the range \u0008-\u000F (line breaks, tabs, etc.)
const CONTROL_CHAR_REGEXP = new RegExp('[\\u0000-\\u0007\\u0010-\\u001F]', 'g');

// export const isDevMode = () => process.env.NODE_ENV !== 'production';

export const internalConsole = {
  debug: console.debug.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  trace: console.trace.bind(console),
  warn: console.warn.bind(console),
};

// internalConsole.info.apply(console, [`***** process.env.NODE_ENV: ${process.env.NODE_ENV}`]);

// Only override console if running in production mode
if (!isDevMode) {
  // internalConsole.info.apply(console, [`***** OVERRIDING CONSOLE!`]);
  // internalConsole.info.apply(console, [`***** process.env.NODE_ENV: ${process.env.NODE_ENV}`]);
  console.info = function (...args) {
    const cleanedArgs = args.map(function (arg) {
      if (typeof arg !== 'string') return arg;
      return escapeControlChars(arg);
    });
    internalConsole.info.apply(console, cleanedArgs);
  };

  console.log = function (...args) {
    const cleanedArgs = args.map(function (arg) {
      if (typeof arg !== 'string') return arg;
      return escapeControlChars(arg);
    });
    internalConsole.log.apply(console, cleanedArgs);
  };
}

function escapeControlChars(input: string) {
  // typings may be wrong, there's scenarios where the message is not a plain string (e.g error stacks from the ES client)
  // if (typeof input !== 'string') {
  //   input = String(input);
  // }

  return input.replace(
    CONTROL_CHAR_REGEXP,
    // Escaping control chars via JSON.stringify to maintain consistency with `meta` and the JSON layout.
    // This way, post analysis of the logs is easier as we can search the same patterns.
    // Our benchmark didn't show a big difference in performance between custom-escaping vs. JSON.stringify one.
    // The slice is removing the double-quotes.
    (substr) => JSON.stringify(substr).slice(1, -1)
  );
}
