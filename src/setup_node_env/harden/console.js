/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// From https://www.ascii-code.com/characters/control-characters,
// but explicitly allowing the range \u0008-\u000F (line breaks, tabs, etc.)
var CONTROL_CHAR_REGEXP = new RegExp('[\\u0000-\\u0007\\u0010-\\u001F]', 'g');

var unsafeConsole = {
  // debug: console.debug.bind(console),
  // error: console.error.bind(console),
  // info: console.info.bind(console),
  log: console.log.bind(console),
  // trace: console.trace.bind(console),
  // warn: console.warn.bind(console),
};

module.exports = { unsafeConsole };

console.log = function (data) {
  var cleanedData;
  if (Array.isArray(data)) {
    cleanedData = data.map(function (element) {
      return escapeControlChars(element);
    });
  } else {
    cleanedData = [escapeControlChars(data)];
  }

  unsafeConsole.log.apply(this, cleanedData);
};

function escapeControlChars(input) {
  // typings may be wrong, there's scenarios where the message is not a plain string (e.g error stacks from the ES client)
  if (typeof input !== 'string') {
    input = String(input);
  }

  // Escaping control chars via JSON.stringify to maintain consistency with `meta` and the JSON layout.
  // This way, post analysis of the logs is easier as we can search the same patterns.
  // Our benchmark didn't show a big difference in performance between custom-escaping vs. JSON.stringify one.
  // The slice is removing the double-quotes.
  function stringify(substr) {
    return JSON.stringify(substr).slice(1, -1);
  }

  return input.replace(CONTROL_CHAR_REGEXP, stringify);
}
