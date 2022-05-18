/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getType } from './get_type';

export function castProvider(types) {
  return function cast(node, toTypeNames) {
    // If you don't give us anything to cast to, you'll get your input back
    if (!toTypeNames || toTypeNames.length === 0) return node;

    // No need to cast if node is already one of the valid types
    const fromTypeName = getType(node);
    if (toTypeNames.includes(fromTypeName)) return node;

    const fromTypeDef = types[fromTypeName];

    for (let i = 0; i < toTypeNames.length; i++) {
      // First check if the current type can cast to this type
      if (fromTypeDef && fromTypeDef.castsTo(toTypeNames[i])) {
        return fromTypeDef.to(node, toTypeNames[i], types);
      }

      // If that isn't possible, check if this type can cast from the current type
      const toTypeDef = types[toTypeNames[i]];
      if (toTypeDef && toTypeDef.castsFrom(fromTypeName)) return toTypeDef.from(node, types);
    }

    throw new Error(`Can not cast '${fromTypeName}' to any of '${toTypeNames.join(', ')}'`);
  };
}
