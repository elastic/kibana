/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { DataStreamAdapter } from './src/data_stream_adapter';
export { DataStreamSpacesAdapter } from './src/data_stream_spaces_adapter';

export { retryTransientEsErrors, ecsFieldMap } from '@kbn/index-adapter';
export type {
  SetComponentTemplateParams,
  SetIndexTemplateParams,
  InstallParams,
  EcsFieldMap,
} from '@kbn/index-adapter';

export * from '@kbn/index-adapter/src/field_maps/types';
