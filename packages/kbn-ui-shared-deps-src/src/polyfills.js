/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('core-js/stable');
require('regenerator-runtime/runtime');

if (typeof window.Event === 'object') {
  // IE11 doesn't support unknown event types, required by react-use
  // https://github.com/streamich/react-use/issues/73
  window.Event = CustomEvent;
}

require('whatwg-fetch');
require('symbol-observable');
