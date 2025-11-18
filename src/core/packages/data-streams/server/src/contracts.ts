/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BaseSearchRuntimeMappings,
  DataStreamDefinition,
  IDataStreamClient,
} from '@kbn/data-streams';
import type { MappingsDefinition, GetFieldsOf } from '@kbn/es-mappings';

/** @public */
export interface DataStreamsSetup {
  /**
   * Register your data stream definition for setup.
   *
   * @remark This will create and update the mappings of the data stream ensuring it's ready to be used at start time
   *
   * @public
   */
  registerDataStream<
    MappingsInDefinition extends MappingsDefinition,
    FullDocumentType extends GetFieldsOf<MappingsInDefinition>,
    SRM extends BaseSearchRuntimeMappings
  >(
    dataStreams: DataStreamDefinition<MappingsInDefinition, FullDocumentType, SRM>
  ): void;
}

/** @public */
export interface DataStreamsStart {
  /** @public */
  getClient<
    S extends MappingsDefinition,
    FullDocumentType extends GetFieldsOf<S> = GetFieldsOf<S>,
    SRM extends BaseSearchRuntimeMappings = never
  >(
    dataStream: string
  ): IDataStreamClient<S, FullDocumentType, SRM>;
}
