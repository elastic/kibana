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
   * @remark This will eagerly create and update the mappings of the data stream, while lazily creating the data stream itself.
   *
   * @public
   */
  registerDataStream<
    MappingsInDefinition extends MappingsDefinition,
    FullDocumentType extends GetFieldsOf<MappingsInDefinition>,
    SRM extends BaseSearchRuntimeMappings
  >(
    dataStreamDefinition: DataStreamDefinition<MappingsInDefinition, FullDocumentType, SRM>
  ): void;
}

/** @public */
export interface DataStreamsStart {
  /**
   * Initializes the data stream client if it is not already initialized.
   * returns the client which interfaces with the data stream.
   *
   * @remark This function initializes the data stream if it is not already initialized. Call it as lazily as possible, as near the ES operations as possible.
   *
   * @public
   */
  initializeClient<
    S extends MappingsDefinition,
    FullDocumentType extends GetFieldsOf<S> = GetFieldsOf<S>,
    SRM extends BaseSearchRuntimeMappings = never
  >(
    dataStreamName: string
  ): Promise<IDataStreamClient<S, FullDocumentType, SRM>>;
}
