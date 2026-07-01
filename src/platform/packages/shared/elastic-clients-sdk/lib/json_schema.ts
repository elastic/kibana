/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A plain JSON Schema object (draft-07 compatible subset).
 *
 * Used as the type for the `input` field of {@link EsApiDefinition} and
 * {@link ApiRegistryDefinition}. The schema carries per-property `x-found-in`
 * routing metadata (`"path"`, `"query"`, or `"body"`) used to route each
 * parameter to the correct part of the HTTP request.
 */
export type JsonSchemaObject = Record<string, unknown>;
