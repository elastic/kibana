/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ClusterGetComponentTemplateResponse,
  IndicesGetAliasResponse,
  IndicesGetDataStreamResponse,
  IndicesGetIndexTemplateResponse,
  IndicesGetMappingResponse,
  IndicesGetTemplateResponse,
} from '@elastic/elasticsearch/lib/api/types';

export interface Field {
  name: string;
  type: string;
}

export interface FieldMapping {
  enabled?: boolean;
  path?: string;
  properties?: Record<string, FieldMapping>;
  type?: string;
  index_name?: string;
  fields?: FieldMapping[];
}

export interface AutoCompleteEntitiesApiResponse {
  mappings: IndicesGetMappingResponse;
  aliases: IndicesGetAliasResponse;
  dataStreams: IndicesGetDataStreamResponse;
  legacyTemplates: IndicesGetTemplateResponse;
  indexTemplates: IndicesGetIndexTemplateResponse;
  componentTemplates: ClusterGetComponentTemplateResponse;
}
