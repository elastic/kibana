/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { STRATEGY_DEFAULTS, MAX_RECURSION_DEPTH } = require('./constants');

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
 * Check if a schema is a primitive type (string, number, boolean, integer)
 * @param {Object} schema - The schema to check
 * @returns {boolean} - True if schema is a primitive type
 */
function isPrimitiveType(schema) {
  if (!schema || typeof schema !== 'object') return false;
  const primitiveTypes = ['string', 'number', 'boolean', 'integer'];
  return (
    primitiveTypes.includes(schema.type) &&
    !schema.properties &&
    !schema.oneOf &&
    !schema.anyOf &&
    !schema.allOf
  );
}

/**
 * Determines if a nested schema should be extracted as a component.
 * Nested schemas are extracted if they:
 * - Are empty objects (if extractEmpty is true)
 * - Are objects with structural fields (properties, additionalProperties, etc.)
 * - Are primitives (if extractPrimitives is true)
 *
 * @param {Object} schema - The schema to check
 * @param {Object} options - Extraction options
 * @param {boolean} options.extractEmpty - Extract empty objects
 * @param {boolean} options.extractPrimitives - Extract primitives
 * @returns {boolean} - True if schema should be extracted
 */
function shouldExtractNestedSchema(schema, { extractEmpty, extractPrimitives }) {
  if (!schema || typeof schema !== 'object') return false;

  // Empty object check
  if (extractEmpty && schema.type === 'object' && !hasStructuralFields(schema)) {
    return true;
  }

  // Object with structural fields
  if (schema.type === 'object' && hasStructuralFields(schema)) {
    return true;
  }

  // Primitive check
  if (extractPrimitives && isPrimitiveType(schema)) {
    return true;
  }

  return false;
}

/**
 * Extracts a nested schema as a component and returns the $ref.
 * This helper consolidates the common extraction pattern used for properties, array items, and additionalProperties.
 *
 * @param {Object} schemaToExtract - The schema to extract
 * @param {Object} context - The context for naming
 * @param {string} type - The type of extraction ('property', 'arrayItem', 'additionalProperty')
 * @param {Function} nameGenerator - Function to generate component names
 * @param {Object} components - The components.schemas object
 * @param {Object} stats - Statistics tracking object
 * @param {Object} log - Logger instance
 * @param {Function} processSchema - The schema processor function
 * @param {number} depth - Current recursion depth
 * @returns {Object} - The $ref object to replace the inline schema
 */
function extractAndReplaceNestedSchema(
  schemaToExtract,
  context,
  type,
  nameGenerator,
  components,
  stats,
  log,
  processSchema,
  depth
) {
  const name = nameGenerator(context, type);

  if (components[name]) {
    log.warn(`Component name already exists: ${name} - appending counter`);
  }

  const schemaToStore = { ...schemaToExtract };
  components[name] = schemaToStore;
  stats.schemasExtracted++;
  log.debug(`Extracted ${type} ${name}`);

  processSchema(schemaToStore, context, depth + 1);

  return { $ref: `#/components/schemas/${name}` };
}

/**
 * Creates a schema processing function that recursively extracts inline schemas into components.
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
 * @param {Object} [options={}] - Strategy options
 * @param {boolean} [options.extractPrimitives=false] - Extract primitive properties as separate components
 * @param {boolean} [options.removeProperties=false] - Remove extracted properties from parent components
 * @param {boolean} [options.extractEmpty=true] - Extract empty object schemas { type: 'object' }
 * @returns {Function} processSchema function
 *
 * @example
 * const components = {};
 * const nameGen = createComponentNameGenerator();
 * const stats = { schemasExtracted: 0, oneOfCount: 0, anyOfCount: 0, allOfCount: 0, maxDepth: 0 };
 * const log = console;
 * const processSchema = createProcessSchema(components, nameGen, stats, log, {
 *   extractPrimitives: false,
 *   removeProperties: false,
 *   extractEmpty: false
 * });
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
const createProcessSchema = (
  components,
  nameGenerator,
  stats,
  log,
  options = { ...STRATEGY_DEFAULTS }
) => {
  if (!components || !nameGenerator || !stats || !log) {
    throw new Error('components, nameGenerator, stats, and log are required');
  }

  const { extractPrimitives, removeProperties, extractEmpty } = options;

  function processSchema(schema, context, depth = 0) {
    if (!schema || typeof schema !== 'object') {
      return;
    }

    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (depth > MAX_RECURSION_DEPTH) {
      log.warn(`Max depth reached at ${context.path || 'unknown path'}`);
      return;
    }

    ['oneOf', 'anyOf', 'allOf'].forEach((compType) => {
      if (schema[compType] && Array.isArray(schema[compType])) {
        log.debug(
          `Found ${compType} with ${schema[compType].length} items at ${context.path || 'root'}`
        );

        schema[compType] = schema[compType].map((item, idx) => {
          if (item.$ref) {
            return item;
          }

          const name = nameGenerator(context, compType, idx);

          if (components[name]) {
            log.warn(`Component name collision: ${name} - appending counter`);
          }

          const itemToStore = item;
          components[name] = itemToStore;
          stats.schemasExtracted++;

          if (compType === 'oneOf') stats.oneOfCount++;
          if (compType === 'anyOf') stats.anyOfCount++;
          if (compType === 'allOf') stats.allOfCount++;

          log.debug(`Extracted ${name}`);

          processSchema(itemToStore, { ...context, depth: depth + 1 }, depth + 1);

          return { $ref: `#/components/schemas/${name}` };
        });
      }
    });

    if (schema.properties && typeof schema.properties === 'object') {
      const propertiesToRemove = [];
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        const propContext = {
          ...context,
          propertyPath: [...(context.propertyPath || []), propName],
        };

        let shouldExtract = false;

        if (shouldExtractNestedSchema(propSchema, { extractEmpty, extractPrimitives })) {
          shouldExtract = true;
        }

        if (shouldExtract) {
          const ref = extractAndReplaceNestedSchema(
            propSchema,
            propContext,
            'property',
            nameGenerator,
            components,
            stats,
            log,
            processSchema,
            depth
          );
          schema.properties[propName] = ref;
          if (removeProperties) {
            propertiesToRemove.push(propName);
          }
        } else {
          processSchema(propSchema, propContext, depth + 1);
        }
      });

      if (removeProperties && propertiesToRemove.length > 0) {
        propertiesToRemove.forEach((propName) => {
          delete schema.properties[propName];
        });
      }
    }

    if (schema.items) {
      const itemContext = {
        ...context,
        inArray: true,
      };
      let shouldExtractItem = false;
      if (shouldExtractNestedSchema(schema.items, { extractEmpty, extractPrimitives })) {
        shouldExtractItem = true;
      }

      if (shouldExtractItem) {
        schema.items = extractAndReplaceNestedSchema(
          schema.items,
          itemContext,
          'arrayItem',
          nameGenerator,
          components,
          stats,
          log,
          processSchema,
          depth
        );
      } else {
        processSchema(schema.items, itemContext, depth + 1);
      }
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const addlPropContext = {
        ...context,
        inAdditionalProperties: true,
      };
      let shouldExtractAddlProp = false;
      if (
        shouldExtractNestedSchema(schema.additionalProperties, { extractEmpty, extractPrimitives })
      ) {
        shouldExtractAddlProp = true;
      }

      if (shouldExtractAddlProp) {
        schema.additionalProperties = extractAndReplaceNestedSchema(
          schema.additionalProperties,
          addlPropContext,
          'additionalProperty',
          nameGenerator,
          components,
          stats,
          log,
          processSchema,
          depth
        );
      } else {
        processSchema(schema.additionalProperties, addlPropContext, depth + 1);
      }
    }
  }
  return processSchema;
};

module.exports = { createProcessSchema };
