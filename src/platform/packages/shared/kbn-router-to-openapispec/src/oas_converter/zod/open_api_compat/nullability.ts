/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Converts OpenAPI 3.1 schemas containing `null` types to OpenAPI 3.0.
 * This function processes schemas that use `anyOf`, `oneOf`, or `allOf`
 * to handle nullability.
 *
 * Open API > 3.0 defined nullability using { }"type": "null" } property
 * where Open API 3.0 defines nullability using the inline `nullable` property.
 * @param obj
 */
export function toOpenAPI30Nullability(obj: any): any {
  if (obj && typeof obj === 'object') {
    for (const key of ['anyOf', 'oneOf', 'allOf']) {
      if (Array.isArray(obj[key])) {
        const schemas = obj[key];
        const nonNullSchemas = schemas.filter((s: any) => !(s && s.type === 'null'));
        const hasNull = schemas.length !== nonNullSchemas.length;
        if (hasNull) {
          nonNullSchemas.forEach((s: any) => (s.nullable = true));
          if (nonNullSchemas.length === 1) {
            Object.assign(obj, nonNullSchemas[0]);
            delete obj[key];
          } else {
            obj[key] = nonNullSchemas;
          }
        }
      }
    }
    // Recursively process properties
    if (obj.properties && typeof obj.properties === 'object') {
      for (const prop in obj.properties) {
        if (Object.prototype.hasOwnProperty.call(obj.properties, prop)) {
          const propSchema = obj.properties[prop];
          if (propSchema && propSchema.type === 'null') {
            obj.properties[prop] = { nullable: true };
          } else {
            toOpenAPI30Nullability(propSchema);
          }
        }
      }
    }
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && k !== 'properties') {
        toOpenAPI30Nullability(obj[k]);
      }
    }
  }
  return obj;
}
