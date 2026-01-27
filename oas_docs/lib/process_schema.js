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
 * Strip metadata fields from a schema, keeping only structural fields
 * @param {Object} schema - The schema to strip
 * @returns {Object} - Schema with metadata removed
 */
function stripMetadata(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const result = {};
  const structuralFields = [
    'type',
    'properties',
    'items',
    'additionalProperties',
    'patternProperties',
    'oneOf',
    'anyOf',
    'allOf',
    'required',
    '$ref',
  ];
  for (const [key, value] of Object.entries(schema)) {
    if (structuralFields.includes(key)) {
      if (key === 'properties' && typeof value === 'object') {
        result[key] = {};
        for (const [propName, propSchema] of Object.entries(value)) {
          result[key][propName] = stripMetadata(propSchema);
        }
      } else if (key === 'items' && typeof value === 'object') {
        result[key] = stripMetadata(value);
      } else if (key === 'additionalProperties' && typeof value === 'object') {
        result[key] = stripMetadata(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => (typeof item === 'object' ? stripMetadata(item) : item));
      } else {
        result[key] = value;
      }
    }
  }
  return result;
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
 * @param {Object} options - Strategy options
 * @param {boolean} options.extractPrimitives - Extract primitive properties as separate components
 * @param {boolean} options.removeProperties - Remove extracted properties from parent components
 * @param {boolean} options.preserveMetadata - Preserve metadata fields like additionalProperties, default, description
 * @param {boolean} options.extractEmpty - Extract empty object schemas { type: 'object' }
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
 *   preserveMetadata: true,
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

  const { extractPrimitives, removeProperties, preserveMetadata, extractEmpty } = options;

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

    // Process each composition type, TODO: extract to helper function (e.g. handleCompositionTypes)
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

          // Apply metadata stripping if needed, TODO: remove
          const itemToStore = preserveMetadata ? item : stripMetadata(item);
          components[name] = itemToStore;
          // Update stats
          stats.schemasExtracted++;

          if (compType === 'oneOf') stats.oneOfCount++;
          if (compType === 'anyOf') stats.anyOfCount++;
          if (compType === 'allOf') stats.allOfCount++;

          log.debug(`Extracted ${name}`);

          // Recursively process the extracted item until all compositions are extracted
          processSchema(itemToStore, { ...context, depth: depth + 1 }, depth + 1);

          // Return reference
          return { $ref: `#/components/schemas/${name}` };
        });
      }
    });

    // Recurse into properties, turn into helper, e.g handleProperties
    if (schema.properties && typeof schema.properties === 'object') {
      const propertiesToRemove = [];
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        const propContext = {
          ...context,
          propertyPath: [...(context.propertyPath || []), propName],
        };

        let shouldExtract = false;
        let extractedName = null;

        // Check if we should extract this property
        if (propSchema && typeof propSchema === 'object') {
          // Extract empty objects if extractEmpty is true
          if (extractEmpty && propSchema.type === 'object' && !hasStructuralFields(propSchema)) {
            shouldExtract = true;
          }
          // Extract objects with structural fields
          else if (propSchema.type === 'object' && hasStructuralFields(propSchema)) {
            shouldExtract = true;
          }
          // Extract primitives if extractPrimitives is true
          else if (extractPrimitives && isPrimitiveType(propSchema)) {
            shouldExtract = true;
          }
        }

        if (shouldExtract) {
          extractedName = nameGenerator(propContext, 'property');
          // Check if name exists
          if (components[extractedName]) {
            log.warn(`Component name already exists: ${extractedName} - appending counter`);
          }
          // Apply metadata stripping if needed
          const schemaToStore = preserveMetadata ? { ...propSchema } : stripMetadata(propSchema);
          components[extractedName] = schemaToStore;
          stats.schemasExtracted++;
          log.debug(`Extracted property ${extractedName}`);
          // Recursively process the extracted schema
          processSchema(schemaToStore, propContext, depth + 1);
          // Replace the inline schema with a reference
          schema.properties[propName] = { $ref: `#/components/schemas/${extractedName}` };
          // Mark for removal if removeProperties is true
          if (removeProperties) {
            propertiesToRemove.push(propName);
          }
        } else {
          // Not extracting, just recurse
          processSchema(propSchema, propContext, depth + 1);
        }
      });

      // Remove extracted properties from parent if removeProperties is true
      if (removeProperties && propertiesToRemove.length > 0) {
        propertiesToRemove.forEach((propName) => {
          delete schema.properties[propName];
        });
      }
    }

    // Recurse into array items, turn into helper, e.g. handleArrayItems
    if (schema.items) {
      const itemContext = {
        ...context,
        inArray: true,
      };
      // Extract nested objects as components if they have structural fields
      // Array items are already nested by definition, so extract them if they have content
      let shouldExtractItem = false;
      if (schema.items && typeof schema.items === 'object') {
        if (extractEmpty && schema.items.type === 'object' && !hasStructuralFields(schema.items)) {
          shouldExtractItem = true;
        } else if (schema.items.type === 'object' && hasStructuralFields(schema.items)) {
          shouldExtractItem = true;
        } else if (extractPrimitives && isPrimitiveType(schema.items)) {
          shouldExtractItem = true;
        }
      }

      if (shouldExtractItem) {
        const name = nameGenerator(itemContext, 'arrayItem');
        // Check if name exists
        if (components[name]) {
          log.warn(`Component name already exists: ${name} - appending counter`);
        }
        // Apply metadata stripping if needed, TODO: remove
        const itemToStore = preserveMetadata ? { ...schema.items } : stripMetadata(schema.items);
        components[name] = itemToStore;
        stats.schemasExtracted++;
        log.debug(`Extracted array item object ${name}`);
        // process extracted object
        processSchema(itemToStore, itemContext, depth + 1);
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
      let shouldExtractAddlProp = false;
      if (schema.additionalProperties.type === 'object') {
        if (extractEmpty && !hasStructuralFields(schema.additionalProperties)) {
          shouldExtractAddlProp = true;
        } else if (hasStructuralFields(schema.additionalProperties)) {
          shouldExtractAddlProp = true;
        }
      }

      if (shouldExtractAddlProp) {
        const name = nameGenerator(addlPropContext, 'additionalProperty');
        // Check if name exists
        if (components[name]) {
          log.warn(`Component name already exists: ${name} - appending counter`);
        }
        // Apply metadata stripping if needed, TODO: remove
        const addlPropToStore = preserveMetadata
          ? { ...schema.additionalProperties }
          : stripMetadata(schema.additionalProperties);
        components[name] = addlPropToStore;
        stats.schemasExtracted++;
        log.debug(`Extracted additionalProperties object ${name}`);
        // Recursively process the extracted object
        processSchema(addlPropToStore, addlPropContext, depth + 1);
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

module.exports = { createProcessSchema, stripMetadata };
