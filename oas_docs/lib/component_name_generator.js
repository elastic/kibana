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

const createComponentNameGenerator = () => {
  const nameMap = new Map();
  /**
   * Generates a unique component name based on context and composition type
   * @param {object} context - Contextual information (method, path, isRequest flag, responseCode, propertyPath)
   * @param {string} compositionType - Type of composition ('oneOf', 'anyOf', 'allOf', 'property', 'arrayItem', 'additionalProperty')
   * @param {number} index - Index for compositions (0-based)
   * @returns {string} - Generated unique component name
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
      parts.push(method.charAt(0).toUpperCase() + method.slice(1).toLowerCase());
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
      parts.push(...propertyPath.map((p) => p.charAt(0).toUpperCase() + p.slice(1)));
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
