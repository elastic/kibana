/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EmbeddableApiContext {
  /**
   * TODO: once all actions are entirely decoupled from the embeddable system, this key should be renamed to "api"
   * to reflect the fact that this context could contain any api.
   */
  embeddable: unknown;
}

export const isEmbeddableApiContext = (context: unknown): context is EmbeddableApiContext =>
  !!context &&
  typeof context === 'object' &&
  !!(context as EmbeddableApiContext).embeddable &&
  typeof (context as EmbeddableApiContext).embeddable === 'object';
