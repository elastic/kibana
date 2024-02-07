/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * `x-internal: true` marks nodes the bundler must NOT include in the result bundled document. Any other values are ignored.
 */
export const X_INTERNAL = 'x-internal';

/**
 * `x-internal: true` marks reference nodes the bundler must inline in the result bundled document.
 */
export const X_INLINE = 'x-inline';

/**
 * `x-modify` marks nodes to be modified by the bundler. `partial` and `required` values are supported.
 *
 * - `partial` leads to removing `required` property making params under `properties` optional
 * - `required` leads to adding or extending `required` property by adding all param names under `properties`
 */
export const X_MODIFY = 'x-modify';

/**
 * `x-codegen-enabled` is used by the code generator package `@kbn/openapi-generator` and shouldn't be included
 *  in result bundled document.
 */
export const X_CODEGEN_ENABLED = 'x-codegen-enabled';
