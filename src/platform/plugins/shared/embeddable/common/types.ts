/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';

export type EmbeddableTransforms<
  StoredEmbeddableState extends object = object,
  EmbeddableState extends object = object
> = {
  /**
   * Converts StoredEmbeddableState and injects references into EmbeddableState
   */
  transformOut?: (storedState: StoredEmbeddableState, references?: Reference[]) => EmbeddableState;
  /**
   * Converts EmbeddableState into StoredEmbeddableState and extracts references
   */
  transformIn?: (state: EmbeddableState) => {
    state: StoredEmbeddableState;
    references?: Reference[];
  };
};
