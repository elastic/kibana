/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'node:path';
import Fs from 'node:fs';
import Ajv from 'ajv';
import AjvErrors from 'ajv-errors';
import AjvKeywords from 'ajv-keywords';
import { getLineNumberForPath } from './find_line_number';
import { condenseErrors } from './condense_errors';
import jsonSchema from './json_schema';
import YAML from 'js-yaml';

const IGNORED_AJV_PARAMS = ['type', 'errors'];
const oas3Schema = YAML.load(
  Fs.readFileSync(Path.resolve(__dirname, './oas_3_schema.yaml')).toString('utf8')
);

export default class JSONSchemaValidator {
  constructor() {
    this.ajv = new Ajv({
      schemaId: 'auto',
      allErrors: true,
      jsonPointers: true,
    });

    AjvKeywords(this.ajv, 'switch');
    AjvErrors(this.ajv);

    this.addSchema(jsonSchema);
    this.addSchema(oas3Schema, ['openapi-3.0']);
  }

  addSchema(schema, key) {
    this.ajv.addMetaSchema(schema, normalizeKey(key));
  }

  validate({ jsSpec, specStr }) {
    this.ajv.validate(normalizeKey(['openapi-3.0']), jsSpec);

    if (!this.ajv.errors || !this.ajv.errors.length) {
      return null;
    }

    const condensedErrors = condenseErrors(this.ajv.errors);
    try {
      const boundGetLineNumber = getLineNumberForPath.bind(null, specStr);

      return condensedErrors.map((err) => {
        let preparedMessage = err.message;
        if (err.params) {
          preparedMessage += '\n';
          for (const k in err.params) {
            if (IGNORED_AJV_PARAMS.indexOf(k) === -1) {
              const ori = err.params[k];
              const value = Array.isArray(ori) ? dedupe(ori).join(', ') : ori;
              preparedMessage += `${k}: ${value}\n`;
            }
          }
        }

        const errorPathArray = jsonPointerStringToArray(err.dataPath);

        return {
          level: 'error',
          line: boundGetLineNumber(errorPathArray || []),
          path: errorPathArray,
          message: preparedMessage.trim(),
          source: 'structure',
          original: err,
        };
      });
    } catch (err) {
      return {
        level: 'error',
        line: (err.problem_mark && err.problem_mark.line + 1) || 0,
        message: err.problem,
        source: 'parser',
        original: err,
      };
    }
  }
}

function dedupe(arr) {
  return arr.filter((val, i) => {
    return arr.indexOf(val) === i;
  });
}

function pathToJSONPointer(arr) {
  return arr.map((a) => (a + '').replace('~', '~0').replace('/', '~1')).join('/');
}

function jsonPointerStringToArray(str) {
  return str
    .split('/')
    .map((part) => (part + '').replace(/~0/g, '~').replace(/~1/g, '/'))
    .filter((str) => str.length > 0);
}

// Convert arrays into a string. Safely, by using the JSONPath spec
function normalizeKey(key) {
  if (!Array.isArray(key)) key = [key];
  return pathToJSONPointer(key);
}
