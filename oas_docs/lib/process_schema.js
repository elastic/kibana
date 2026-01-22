/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MAX_RECURSION_DEPTH = 20;

const createProcessSchema = (components, nameGenerator, stats, log) => {
  if (!components || !nameGenerator || !stats || !log) {
    throw new Error('components, nameGenerator, stats, and log are required');
  }
  /**
   * Recursively process a schema, extracting compositions, properties, array items, and additionalProperties if they're an object
   * @param {object} schema - The schema to process
   * @param {object} context - Contextual information (method, path, operationId, propertyPath, isRequest flag, path.)
   * @param {number} depth - Current recursion depth
   */
  function processSchema(schema, context, depth = 0) {
    // base case: not a schema or the schema isn't an object
    if (!schema || typeof schema !== 'object') {
      return;
    }

    // Track max depth
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    // warn and exit recursion on exceeding max depth
    // Can change to throw error to enforce flatter schemas
    if (depth > MAX_RECURSION_DEPTH) {
      log.warn(`Max depth reached at ${context.path || 'unknown path'}`);
      return;
    }

    // Process each composition type, we could extract this to a helper function if needed
    ['oneOf', 'anyOf', 'allOf'].forEach((compType) => {
      if (schema[compType] && Array.isArray(schema[compType])) {
        log.debug(
          `Found ${compType} with ${schema[compType].length} items at ${context.path || 'root'}`
        );

        schema[compType] = schema[compType].map((item, idx) => {
          // Skip if already a reference
          if (item.$ref) {
            return item;
          }

          const name = nameGenerator(context, compType, idx);

          // Check for name collision
          if (components[name]) {
            log.warn(`Component name collision: ${name} - appending counter`);
          }

          components[name] = item;
          // Update stats
          stats.schemasExtracted++;

          if (compType === 'oneOf') stats.oneOfCount++;
          if (compType === 'anyOf') stats.anyOfCount++;
          if (compType === 'allOf') stats.allOfCount++;

          log.debug(`Extracted ${name}`);

          // Recursively process the extracted item until all compositions are extracted
          processSchema(item, { ...context, depth: depth + 1 }, depth + 1);

          // Return reference
          return { $ref: `#/components/schemas/${name}` };
        });
      }
    });

    // Recurse into properties
    if (schema.properties && typeof schema.properties === 'object') {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        const propContext = {
          ...context,
          propertyPath: [...(context.propertyPath || []), propName],
        };
        // Extract nested objects as components
        // Skip empty objects
        // Properties are already nested by definition, so always extract them
        if (
          propSchema &&
          typeof propSchema === 'object' &&
          propSchema.type === 'object' &&
          propSchema.properties &&
          Object.keys(propSchema.properties).length > 0
        ) {
          const name = nameGenerator(propContext, 'property');
          // Check if name exists
          if (components[name]) {
            log.warn(`Component name already exists: ${name} - appending counter`);
          }
          // Store the object schema in components
          components[name] = { ...propSchema };
          stats.schemasExtracted++;
          log.debug(`Extracted property object ${name}`);
          // Recursively process the extracted object
          processSchema(propSchema, propContext, depth + 1);
          // Replace the inline object with a reference
          schema.properties[propName] = { $ref: `#/components/schemas/${name}` };
        } else {
          // Not an object to extract, just recurse
          processSchema(propSchema, propContext, depth + 1);
        }
      });
    }

    // Recurse into array items
    if (schema.items) {
      const itemContext = {
        ...context,
        inArray: true,
      };
      // Extract nested objects as components
      // Skip empty objects (objects without properties)
      // Array items are already nested by definition, so always extract them
      if (
        schema.items &&
        typeof schema.items === 'object' &&
        schema.items.type === 'object' &&
        schema.items.properties &&
        Object.keys(schema.items.properties).length > 0
      ) {
        const name = nameGenerator(itemContext, 'arrayItem');
        // Check if name exists
        if (components[name]) {
          log.warn(`Component name already exists: ${name} - appending counter`);
        }
        // Store object schema in components
        components[name] = { ...schema.items };
        stats.schemasExtracted++;
        log.debug(`Extracted array item object ${name}`);
        // process extracted object
        processSchema(schema.items, itemContext, depth + 1);
        // Replace inline object with reference
        schema.items = { $ref: `#/components/schemas/${name}` };
      } else {
        // Not an object to extract, just recurse
        processSchema(schema.items, itemContext, depth + 1);
      }
    }

    // Recurse into additionalProperties if it's a schema (additionalProperties: <boolean> | {})
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const addlPropContext = {
        ...context,
        inAdditionalProperties: true,
      };
      // Extract nested objects as components
      // Skip empty objects (objects without properties)
      // AdditionalProperties are already nested by definition, so always extract them
      if (
        schema.additionalProperties.type === 'object' &&
        schema.additionalProperties.properties &&
        Object.keys(schema.additionalProperties.properties).length > 0
      ) {
        const name = nameGenerator(addlPropContext, 'additionalProperty');
        // Check if name exists
        if (components[name]) {
          log.warn(`Component name already exists: ${name} - appending counter`);
        }
        // Store the object schema in components
        components[name] = { ...schema.additionalProperties };
        stats.schemasExtracted++;
        log.debug(`Extracted additionalProperties object ${name}`);
        // Recursively process the extracted object
        processSchema(schema.additionalProperties, addlPropContext, depth + 1);
        // Replace the inline object with a reference
        schema.additionalProperties = { $ref: `#/components/schemas/${name}` };
      } else {
        // Not an object to extract, just recurse
        processSchema(schema.additionalProperties, addlPropContext, depth + 1);
      }
    }
  }
  return processSchema;
};

module.exports = { createProcessSchema };
