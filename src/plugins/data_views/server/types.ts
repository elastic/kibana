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

/**
 * Data Views service factory
 */
type ServiceFactory = (
  /**
   * Saved objects client
   */
  savedObjectsClient: SavedObjectsClientContract,
  /**
   * Elasticsearch client
   */
  elasticsearchClient: ElasticsearchClient,
  /**
   * Kibana request object
   */
  request?: KibanaRequest,
  /**
   * Ignore capabilities
   */
  byPassCapabilities?: boolean
) => Promise<DataViewsService>;

/**
 * DataViews server plugin start api
 */
export interface DataViewsServerPluginStart {
  /**
   * Returns a DataViews service instance
   */
  dataViewsServiceFactory: ServiceFactory;
}

/**
 * DataViews server plugin setup api
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataViewsServerPluginSetup {}

/**
 * Data Views server setup dependencies
 * @public
 */
export interface DataViewsServerPluginSetupDependencies {
  /**
   * File formats
   */
  fieldFormats: FieldFormatsSetup;
  /**
   * Expressions
   */
  expressions: ExpressionsServerSetup;
  /**
   * Usage collection
   */
  usageCollection?: UsageCollectionSetup;
}

/**
 * Data Views server start dependencies
 * @public
 */
export interface DataViewsServerPluginStartDependencies {
  /**
   * Field formats
   */
  fieldFormats: FieldFormatsStart;
  /**
   * Logger
   */
  logger: Logger;
}
