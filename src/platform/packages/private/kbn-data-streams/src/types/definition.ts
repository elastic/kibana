/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnsureSubsetOf, GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import type * as api from '@elastic/elasticsearch/lib/api/types';
import type { BaseSearchRuntimeMappings } from './runtime';

export type AnyDataStreamDefinition = DataStreamDefinition<any, any, any>;

export interface DataStreamDefinition<
  Mappings extends MappingsDefinition,
  FullMappings extends GetFieldsOf<Mappings> = GetFieldsOf<Mappings>,
  SearchRuntimeMappings extends BaseSearchRuntimeMappings = never
> {
  /**
   * @remark Once released this should never change.
   */
  name: string;

  // https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
  searchRuntimeMappings?: SearchRuntimeMappings;

  /**
   * Is this a hidden data stream?
   * @default true
   */
  hidden?: boolean;

  /**
   * @remark Must be **incremented** in order to release a new version of the template definition.
   * @remark Must be greater than 0
   */
  version: number;

  /**
   * The index template definition for the data stream.
   *
   * This template definition corresponds to types from ES:
   *  - api.IndicesPutIndexTemplateRequest
   *  - api.IndicesIndexTemplate
   *  - api.IndicesIndexTemplateSummary
   */
  template: Pick<api.IndicesIndexTemplateSummary, 'aliases'> & {
    /** @default 100 */
    priority?: number;

    /**
     * Auto-populated with the following properties:
     * managed: true;                  // present as a managed index template/data stream
     * userAgent: string;              // an indication of what code created the resources
     * version: string;                // the deployed version of the template definition
     * previousVersions: string[];     // previous data stream definitions
     */
    _meta?: {
      [key: string]: unknown;
    };

    mappings?: EnsureSubsetOf<Mappings, FullMappings> extends true ? Mappings : never;

    /**
     * @remark "hidden" defaults to true for the data stream and the backing indices
     */
    settings?: api.IndicesIndexSettings;

    /**
     * @remark Stick to defining and sharing mappings as plain JavaScript objects.
     * @remark Use component templates if you would like to allow end users to define mappings. You will have to ensure
     *         that updated mappings are applied to existing indices.
     */
    composedOf?: string[];
  };
}
