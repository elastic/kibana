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
 */
export function traverseObject(obj: unknown, onVisit: (element: object) => void) {
  function search(element: unknown) {
    if (typeof element === 'object' && element !== null) {
      onVisit(element);

      Object.values(element).forEach((value) => {
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
