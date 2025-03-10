/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A plain object node not containing `$ref` property
 */
export type PlainObjectNode = Record<string, unknown>;

/**
 * An array node
 */
export type ArrayNode = unknown[];

/**
 * A ref node containing `$ref` property besides the others
 */
export interface RefNode extends PlainObjectNode {
  $ref: string;
}

/**
 * An abstract OpenAPI entry node. Content besides $ref isn't important.
 */
export type DocumentNode = PlainObjectNode | ArrayNode | RefNode;
