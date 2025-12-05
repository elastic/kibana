/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import type { Reference } from '@kbn/content-management-utils';

export type EmbeddableTransforms<
  StoredEmbeddableState extends object = object,
  EmbeddableState extends object = object
> = {
  /**
   * Temporary flag indicating transformOut injects references
   * When true, container REST API responses will drop references for panels that use transformOut
   * TODO: remove once all reference injection is done in server
   */
  transformOutInjectsReferences?: boolean;
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
  /**
   * Embeddable containers that include embeddable state in REST APIs, such as dashboard,
   * use schemas to
   * 1) Include embeddable state schemas in OpenAPI Specification (OAS) documenation.
   * 2) Validate embeddable state, failing requests when schema validation fails.
   *
   * When schema is provided, EmbeddableState is expected to be TypeOf<typeof schema>
   */
  schema?: Type<object>;
  /**
   * Throws error when panel config is not supported.
   */
  throwOnUnmappedPanel?: (config: EmbeddableState) => void;
};
