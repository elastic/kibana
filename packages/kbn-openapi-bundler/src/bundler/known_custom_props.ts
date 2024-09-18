/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `x-internal: true` marks nodes the bundler must NOT include in the result bundled document. Any other values are ignored.
 * See README for more details.
 */
export const X_INTERNAL = 'x-internal';

/**
 * `x-inline: true` marks reference nodes the bundler must inline in the result bundled document.
 * See README for more details.
 */
export const X_INLINE = 'x-inline';

/**
 * `x-modify` marks nodes to be modified by the bundler. `partial` and `required` values are supported. See README for more details.
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

/**
 * `x-labels` allows to mark operation objects with arbitrary labels. It allows to exclude or include nodes
 * marked with specific labels into the resulting bundle. See README for more details.
 */
export const X_LABELS = 'x-labels';
