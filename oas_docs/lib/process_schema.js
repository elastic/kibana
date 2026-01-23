/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MAX_RECURSION_DEPTH = 100;

/**
 * Check if a schema has structural fields worth extracting as a component.
 * Structural fields define the shape/structure of data, as opposed to metadata fields.
 *
 * @param {Object} schema - The schema to check
 * @returns {boolean} - True if schema has structural fields (properties, additionalProperties, patternProperties, composition types)
 *
 * @example
 * hasStructuralFields({ type: 'object', properties: { id: { type: 'string' } } }) // true
 * hasStructuralFields({ type: 'object', additionalProperties: { type: 'string' } }) // true
 * hasStructuralFields({ type: 'object', description: 'metadata only' }) // false
 * hasStructuralFields({ type: 'object' }) // false (empty object)
 */
function hasStructuralFields(schema) {
  if (!schema || typeof schema !== 'object') return false;

  // Has properties
  if (
    schema.properties &&
    typeof schema.properties === 'object' &&
    Object.keys(schema.properties).length > 0
  ) {
    return true;
  }

  // Has additionalProperties (schema, not boolean)
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    return true;
  }

  // Has patternProperties
  if (
    schema.patternProperties &&
    typeof schema.patternProperties === 'object' &&
    Object.keys(schema.patternProperties).length > 0
  ) {
    return true;
  }

  // Has composition types
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    return true;
  }

  return false;
}

/**
 * Creates a schema processing function that recursively extracts inline schemas into components.
 *
 * The processor extracts:
 * - Composition types (oneOf/anyOf/allOf) into separate components
 * - Nested object properties into separate components
 * - Array item objects into separate components
 * - additionalProperties objects into separate components
 *
 * @param {Object} components - The components.schemas object to populate with extracted schemas
 * @param {Function} nameGenerator - Function to generate unique component names
 * @param {Object} stats - Statistics object to track extraction metrics
 * @param {number} stats.schemasExtracted - Counter for total schemas extracted
 * @param {number} stats.oneOfCount - Counter for oneOf items extracted
 * @param {number} stats.anyOfCount - Counter for anyOf items extracted
 * @param {number} stats.allOfCount - Counter for allOf items extracted
 * @param {number} stats.maxDepth - Maximum recursion depth reached
 * @param {Object} log - Logger instance with debug/warn methods
 * @returns {Function} processSchema function
 *
 * @example
 * const components = {};
 * const nameGen = createComponentNameGenerator();
 * const stats = { schemasExtracted: 0, oneOfCount: 0, anyOfCount: 0, allOfCount: 0, maxDepth: 0 };
 * const log = console;
 * const processSchema = createProcessSchema(components, nameGen, stats, log);
 *
 * // Process a schema with oneOf
 * const schema = {
 *   oneOf: [
 *     { type: 'object', properties: { a: { type: 'string' } } },
 *     { type: 'object', properties: { b: { type: 'number' } } }
 *   ]
 * };
 * processSchema(schema, { method: 'get', path: '/api/test', isRequest: false, responseCode: '200' });
 *
 * // Result: schema.oneOf items replaced with $ref, components populated
 * // schema.oneOf = [{ $ref: '#/components/schemas/...' }, { $ref: '#/components/schemas/...' }]
 */
const createProcessSchema = (components, nameGenerator, stats, log) => {
  if (!components || !nameGenerator || !stats || !log) {
    throw new Error('components, nameGenerator, stats, and log are required');
  }

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
        // Extract nested objects as components if they have structural fields
        // Properties are already nested by definition, so extract them if they have content
        if (
          propSchema &&
          typeof propSchema === 'object' &&
          propSchema.type === 'object' &&
          hasStructuralFields(propSchema)
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
      // Extract nested objects as components if they have structural fields
      // Array items are already nested by definition, so extract them if they have content
      if (
        schema.items &&
        typeof schema.items === 'object' &&
        schema.items.type === 'object' &&
        hasStructuralFields(schema.items)
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
      // Extract nested objects as components if they have structural fields
      // AdditionalProperties are already nested by definition, so extract them if they have content
      if (
        schema.additionalProperties.type === 'object' &&
        hasStructuralFields(schema.additionalProperties)
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
