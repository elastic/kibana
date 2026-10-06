/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AnyDataStreamDefinition } from '@kbn/data-streams';
import type { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
interface StartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
}
/** @internal */
export declare class DataStreamsService implements CoreService<DataStreamsSetup, DataStreamsStart> {
  private readonly coreContext;
  private readonly logger;
  private config?;
  private readonly dataStreamDefinitions;
  private readonly dataStreamClients;
  constructor(coreContext: CoreContext);
  setup(): Promise<{
    registerDataStream: (dataStreamDefinition: AnyDataStreamDefinition) => void;
  }>;
  private initializeDataStream;
  private initializeAllDataStreams;
  start({ elasticsearch }: StartDeps): Promise<DataStreamsStart>;
  stop(): void;
}
export {};
