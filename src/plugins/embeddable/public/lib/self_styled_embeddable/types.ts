/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface SelfStyledOptions {
  hideTitle?: boolean;
}

/**
 * All embeddables that implement this interface will be able to configure
 * the style of their containing panels
 * @public
 */
export interface SelfStyledEmbeddable {
  /**
   * Gets the embeddable's style configuration
   */
  getSelfStyledOptions: () => SelfStyledOptions;
}

export function isSelfStyledEmbeddable(incoming: unknown): incoming is SelfStyledEmbeddable {
  return !!(incoming as SelfStyledEmbeddable).getSelfStyledOptions;
}
