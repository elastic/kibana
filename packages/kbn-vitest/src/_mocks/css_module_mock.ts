/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Mock for CSS module imports (*.module.css, *.module.scss).
 * Returns a Proxy that returns the class name as-is, which is useful for testing.
 */
const cssModuleMock = new Proxy(
  {},
  {
    get(_target, prop) {
      // Return the property name as the class name
      // This makes assertions like expect(element).toHaveClass('myClass') work
      return String(prop);
    },
  }
);

export { cssModuleMock };
