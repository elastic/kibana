/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This proxy allows for CSS Modules to be interpreted properly by
 * Jest.  Given a CSS Module class `thisClass`, we'd expect it to
 * be obfuscated at runtime.  With this mock, `thisClass` will be
 * returned.  This allows for consistent enzyme and snapshot tests.
 */
module.exports = new Proxy(
  {},
  {
    get: function getter(target, key) {
      if (key === '__esModule') {
        return false;
      }
      return key;
    },
  }
);
