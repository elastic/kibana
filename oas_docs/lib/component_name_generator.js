/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const cleanAndNormalizePath = (pathStr) => {
  return pathStr
    .trim()
    .replace(/^[\/]+/, '') // remove leading slashes
    .replace(/[\/]+$/, '') // remove trailing slashes
    .replace(/^(internal\/api\/|internal\/|api\/)/, '') // remove api prefixes
    .replace(/\{[^}]*\}/g, '') // remove path parameters like {id}, {rule_id}
    .replace(/[\?\*]/g, '') // remove ? *
    .replace(/[\/\_\-]+/g, '/') // normalize separators and collapse multiple
    .replace(/\/_/g, '/') // remove leading underscores after slash
    .replace(/^_+|_+$/g, '') // remove leading/trailing underscores
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '_')
    .map((segment) => {
      // Convert segment to PascalCase
      return segment
        .split(/[\-\_]/) // split on hyphens and underscores
        .filter((word) => word.length > 0) // remove empty words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    })
    .join('');
};

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function fromPropertyPaths(propertyPath) {
  return propertyPath.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
}

/**
 * Creates a component name generator with collision detection.
 *
 * Naming Strategy:
 * - Converts API paths to PascalCase (e.g., /api/actions/connector -> ApiActionsConnector)
 * - Removes path parameters ({id}, {rule_id}) while preserving meaningful segments
 * - Adds HTTP method in PascalCase (Get, Post, Put, etc.)
 * - Adds "Request" or "Response" based on context
 * - Includes response codes (200, 404, etc.)
 * - Handles nested property paths for detailed naming
 * - Adds 1-based indexing for composition types (oneOf/anyOf/allOf)
 * - Ensures uniqueness by appending numeric suffixes on collision
 *
 * @returns {Function} generateName function
 *
 * @example
 * const nameGen = createComponentNameGenerator();
 *
 * // Basic response schema
 * nameGen({ method: 'get', path: '/api/actions/connector/{id}', isRequest: false, responseCode: '200' })
 * // => 'ApiActionsConnector_Get_Response_200'
 *
 * // OneOf/AnyOf indexing
 * nameGen({ method: 'get', path: '/api/actions/connector', isRequest: false, responseCode: '200' }, 'oneOf', 0)
 * // => 'ApiActionsConnector_Get_Response_200_1'
 *
 * // Property schemas
 * nameGen({ method: 'get', path: '/api/actions/connector/{id}', isRequest: false, responseCode: '200', propertyPath: ['config'] }, 'property')
 * // => 'ApiActionsConnector_Get_Response_200_Config'
 *
 * // Complex paths with parameters and underscores
 * nameGen({ method: 'get', path: '/api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute', isRequest: false, responseCode: '200' })
 * // => 'ApiAlertingRuleAlertUnmute_Get_Response_200'
 */
const createComponentNameGenerator = () => {
  const nameMap = new Map();
  /**
   * Generates a unique component name based on context and composition type.
   *
   * @param {Object} context - Contextual information for naming
   * @param {string|null} context.method - HTTP method (get, post, etc.) or null for components
   * @param {string|null} context.path - API path (/api/test) or null for components
   * @param {boolean|undefined} context.isRequest - true for request, false for response, undefined for components
   * @param {string|null} context.responseCode - HTTP response code (200, 404, etc.) or null
   * @param {Array<string>} [context.propertyPath=[]] - Path of nested properties
   * @param {string} [compositionType] - Type: 'oneOf', 'anyOf', 'allOf', 'property', 'arrayItem', 'additionalProperty'
   * @param {number} [index] - Index for composition types (0-based, converted to 1-based in name)
   * @returns {string} Generated unique component name
   */
  return function generateName(context, compositionType, index) {
    const { method, path, isRequest, responseCode, propertyPath = [] } = context;

    // Convert path to PascalCase API name
    const buildApiName = (pathStr) => {
      if (!pathStr) return '';
      // Clean and normalize path
      const cleanPath = cleanAndNormalizePath(pathStr);
      return 'Api' + cleanPath;
    };

    const parts = [];
    parts.push(buildApiName(path));
    if (method) {
      parts.push(toPascalCase(method));
    }
    // Add request/response type
    if (isRequest !== undefined) {
      parts.push(isRequest ? 'Request' : 'Response');
    }

    // Add response code
    if (responseCode) {
      parts.push(responseCode);
    }

    // Add property path (for nested objects)
    if (propertyPath && propertyPath.length > 0) {
      parts.push(...fromPropertyPaths(propertyPath));
    }

    // Add composition type suffixes
    if (compositionType === 'property') {
      // Property objects already have their name in propertyPath, nothing to append
    } else if (compositionType === 'arrayItem') {
      parts.push('Item');
    } else if (compositionType === 'additionalProperty') {
      parts.push('Value');
    } else if (compositionType && index !== undefined) {
      // For oneOf, anyOf, allOf - add 1-based index
      parts.push(`${index + 1}`);
    }

    let name = parts.filter(Boolean).join('_');

    // Ensure uniqueness
    const cachedCount = nameMap.get(name) ?? 0;
    nameMap.set(name, cachedCount + 1);
    if (cachedCount > 0) {
      name = `${name}_${cachedCount}`;
    }

    return name;
  };
};

module.exports = { createComponentNameGenerator };
