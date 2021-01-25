/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function createAssignmentProxy(object, interceptor) {
  const originalValues = new Map();

  return new Proxy(object, {
    set(target, property, value) {
      if (!originalValues.has(property)) {
        originalValues.set(property, object[property]);
      }

      return Reflect.set(target, property, interceptor(property, value));
    },

    get(target, property) {
      if (property === 'revertProxiedAssignments') {
        return function () {
          for (const [property, value] of originalValues) {
            object[property] = value;
          }
        };
      }

      return Reflect.get(target, property);
    },
  });
}
