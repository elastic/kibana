/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Logger,
  SavedObjectsClientContract,
  ElasticsearchClient,
  KibanaRequest,
} from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { DataViewsService } from '../common';

type ServiceFactory = (
  savedObjectsClient: SavedObjectsClientContract,
  elasticsearchClient: ElasticsearchClient,
  request?: KibanaRequest,
  byPassCapabilities?: boolean
) => Promise<DataViewsService>;
export interface DataViewsServerPluginStart {
  dataViewsServiceFactory: ServiceFactory;
  /**
   * @deprecated Renamed to dataViewsServiceFactory
   */
  indexPatternsServiceFactory: ServiceFactory;
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
export interface DataViewsServerPluginSetup {}

export type IndexPatternsServiceStart = DataViewsServerPluginStart;

export interface DataViewsServerPluginSetupDependencies {
  fieldFormats: FieldFormatsSetup;
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface DataViewsServerPluginStartDependencies {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}
