/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/**
 * Creates a name generator for component schemas
 * Based on pattern from kbn-router-to-openapispec/src/util.ts
 */
// TODO: test!!!
const createComponentNameGenerator = () => {
  const nameMap = new Map();

  return function generateName(context, compositionType, index) {
    const { method, path, operationId, isRequest, responseCode, propertyPath = [] } = context;

    // Derive operation ID if not given
    let opId = operationId;
    if (!opId) {
      // gnarly path cleaning with regexes: TODO: ensure security concerns are addressed
      // cleans /api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute
      // TODO: extract to util for easier testing
      const cleanPath = path
        // remove whitespace
        .trim()
        // remove leading slashes
        .replace(/^[\/]+/, '')
        // remove trailing slashes
        .replace(/[\/]+$/, '')
        // to lower case (in case of mixed case)
        .toLowerCase()
        // theoretically should skip /internal/
        .replace(/^(internal\/api\/|internal\/|api\/)/, '')
        // remove { } ? *
        .replace(/[\{\}\?\*]/g, '')
        // replace / and _ with -
        .replace(/[\/_]/g, '-')
        // collapse multiple -
        .replace(/[-]+/g, '-');
      opId = `${method.toLowerCase()}-${cleanPath}`;
    }

    // Build name parts
    // Follow up with allowing custom naming strategy via options
    // TODO: Ensure security-safe regex usage
    const parts = [
      opId.replace(/[^a-zA-Z0-9]/g, ''),
      isRequest ? 'Request' : 'Response',
      responseCode,
      ...propertyPath.map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
    ].filter(Boolean);

    // Add composition type and index if applicable (arrays etc)
    if (compositionType && index !== undefined) {
      parts.push(`${index + 1}`);
    }

    let name = parts.join('_');

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
