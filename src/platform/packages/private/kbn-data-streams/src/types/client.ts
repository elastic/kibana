/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingsDefinition, GetFieldsOf } from '@kbn/es-mappings';
import type * as api from '@elastic/elasticsearch/lib/api/types';
import type { InternalIDataStreamClient } from './es_api';
import type { BaseSearchRuntimeMappings } from './runtime';

export type AnyIDataStreamClient = IDataStreamClient<any, any, any>;

export interface ClientHelpers<SRM extends BaseSearchRuntimeMappings> {
  /** A helper to get types from your search runtime fields */
  getFieldsFromHit: (response: api.SearchHit) => {
    [key in Exclude<keyof SRM, number | symbol>]: unknown[];
  };
}

export interface IDataStreamClient<
  MappingsInDefinition extends MappingsDefinition,
  FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>,
  SRM extends BaseSearchRuntimeMappings = never
> extends InternalIDataStreamClient<MappingsInDefinition, FullDocumentType, SRM> {
  /** Clint Helpers */
  helpers: ClientHelpers<SRM>;
}
