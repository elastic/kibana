/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

module.exports = (params) => {
  const result = {};
  Object.keys(params).forEach((param) => {
    const { type, description = '', options = [] } = params[param];
    const [, defaultValue] = description.match(/\(default: (.*)\)/) || [];
    switch (type) {
      case undefined:
        // { description: 'TODO: ?' }
        break;
      case 'int':
        result[param] = 0;
        break;
      case 'double':
        result[param] = 0.0;
        break;
      case 'enum':
        // This is to clean up entries like: "d (Days)". We only want the "d" part.
        if (param === 'time') {
          result[param] = options.map((option) => option.split(' ')[0]);
        } else {
          result[param] = options;
        }
        break;
      case 'boolean':
        result[param] = '__flag__';
        break;
      case 'time':
      case 'date':
      case 'string':
      case 'number':
      case 'number|string':
        result[param] = defaultValue || '';
        break;
      case 'list':
        result[param] = [];
        break;
      default:
        throw new Error(`Unexpected type ${type}`);
    }
  });
  return result;
};
