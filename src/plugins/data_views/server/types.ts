/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, SavedObjectsClientContract, ElasticsearchClient } from 'kibana/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { DataViewsService } from '../common';
import { FieldFormatsSetup, FieldFormatsStart } from '../../field_formats/server';

export interface IndexPatternsServiceStart {
  indexPatternsServiceFactory: (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) => Promise<DataViewsService>;
}

export interface IndexPatternsServiceSetupDeps {
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface IndexPatternsServiceStartDeps {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataViewPluginSetup {}

export type DataViewPluginStart = IndexPatternsServiceStart;

export interface DataViewPluginSetupDependencies {
  fieldFormats: FieldFormatsSetup;
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface DataViewPluginStartDependencies {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}
