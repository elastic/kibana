/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

function hardenPrototypes() {
  // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal
  // > The Object.seal() static method seals an object.
  // > Sealing an object prevents extensions and makes existing properties non-configurable.
  // > A sealed object has a fixed set of properties: new properties cannot be added, existing properties cannot be removed,
  // > their enumerability and configurability cannot be changed, and its prototype cannot be re-assigned.
  // > Values of existing properties can still be changed as long as they are writable.
  // Object.freeze would take this one step further, and prevent the values of the properties from being changed as well.
  // This is not currently feasible for Kibana, as this functionality is required for some of the libraries that we use, such as react-dom/server.
  // While Object.seal() is not a silver bullet, it does provide a good balance between security and compatibility.
  // The goal is to prevent a majority of prototype pollution vulnerabilities that can be exploited by an attacker.

  Object.seal(Object.prototype);
  Object.seal(Number.prototype);
  Object.seal(String.prototype);
  Object.seal(Function.prototype);

  // corejs currently manipulates Array.prototype, so we cannot seal it here.
  // this is instead sealed within `src/platform/packages/shared/kbn-security-hardening/prototype.ts`
}

module.exports = hardenPrototypes;
