/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-check

/**
 * @typedef {{ child: (key: string) => unknown }} LocationLike
 * @typedef {{ location: LocationLike; report: (issue: { message: string; location: unknown }) => void }} RuleContextLike
 * @typedef {{ in?: unknown; name?: unknown; required?: boolean }} ParameterLike
 * @typedef {{ enum?: unknown; nullable?: unknown; type?: unknown }} SchemaLike
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {unknown} value
 * @returns {value is ParameterLike & { in: 'path'; name: string }}
 */
const isPathParameter = (value) => {
  return isPlainObject(value) && value.in === 'path' && typeof value.name === 'string';
};

/**
 * @param {unknown} value
 * @returns {value is SchemaLike & { enum: []; nullable: true; type?: undefined }}
 */
const isNullablePlaceholder = (value) => {
  return (
    isPlainObject(value) &&
    Array.isArray(value.enum) &&
    value.enum.length === 0 &&
    value.nullable === true &&
    value.type === undefined
  );
};

/**
 * @returns {{ any: { leave(node: unknown, ctx: RuleContextLike): void } }}
 */
function PathParametersRequired() {
  return {
    any: {
      /**
       * @param {unknown} node
       * @param {RuleContextLike} ctx
       */
      leave(node, ctx) {
        if (!isPathParameter(node) || node.required === true) {
          return;
        }

        ctx.report({
          message: `Path parameter "${node.name}" must set \`required: true\`.`,
          location: ctx.location.child('required'),
        });
      },
    },
  };
}

/**
 * @returns {{ any: { leave(node: unknown, ctx: RuleContextLike): void } }}
 */
function NoEmptyNullableEnum() {
  return {
    any: {
      /**
       * @param {unknown} node
       * @param {RuleContextLike} ctx
       */
      leave(node, ctx) {
        if (!isNullablePlaceholder(node)) {
          return;
        }

        ctx.report({
          message:
            'Found the internal `enum: []` + `nullable: true` placeholder. Null values must be emitted as an OpenAPI-compatible schema.',
          location: ctx.location,
        });
      },
    },
  };
}

module.exports = {
  id: 'compatibility-rules-plugin',
  rules: {
    oas3: {
      'path-parameters-required': PathParametersRequired,
      'no-empty-nullable-enum': NoEmptyNullableEnum,
    },
  },
  _test: {
    isNullablePlaceholder,
    isPathParameter,
  },
};
