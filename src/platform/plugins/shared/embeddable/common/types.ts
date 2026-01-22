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
   * Converts StoredEmbeddableState and injects references into EmbeddableState
   * @param storedState
   * @param panelReferences Panel references - BWC issue where panel references can not be determined for by-value panels created in 7.12
   *                                           Use containerReferences to look for missing panel references
   * @param containerReferences Container references
   * @returns EmbeddableState
   */
  transformOut?: (
    storedState: StoredEmbeddableState,
    panelReferences?: Reference[],
    containerReferences?: Reference[],
    /**
     * @deprecated ID is passed as an argument for legacy reference names that require it
     * to fetch their old references. It should not be used for new reference names.
     */
    id?: string
  ) => EmbeddableState;
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
  getSchema?: () => Type<object> | undefined;
  /**
   * Throws error when panel config is not supported.
   */
  throwOnUnmappedPanel?: (config: EmbeddableState) => void;
};
