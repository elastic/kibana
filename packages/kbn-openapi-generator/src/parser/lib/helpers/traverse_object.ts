/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A generic function to traverse an object or array of objects recursively
 *
 * @param obj The object to traverse
 * @param onVisit A function that will be called for each traversed node in the object
 *                Optionally it can return an object to be used for further traversal
 *                as a child node. It helps to "expand" OpenAPI references.
 */
export function traverseObject(obj: unknown, onVisit: (element: object) => object | void) {
  function search(element: unknown) {
    if (typeof element === 'object' && element !== null) {
      const nextNode = onVisit(element);

      Object.values(nextNode ?? element).forEach((value) => {
        if (Array.isArray(value)) {
          value.forEach(search);
        } else {
          search(value);
        }
      });
    }
  }

  search(obj);
}
