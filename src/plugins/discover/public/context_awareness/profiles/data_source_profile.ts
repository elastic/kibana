/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { DiscoverDataSource } from '../../../common/data_sources';
import { AsyncProfileProvider, AsyncProfileService } from '../profile_service';
import type { Profile } from '../types';
import type { RootContext } from './root_profile';

/**
 * Indicates the category of the data source (e.g. logs, alerts, etc.)
 */
export enum DataSourceCategory {
  Logs = 'logs',
  Default = 'default',
}

/**
 * The data source profile interface
 */
export type DataSourceProfile = Profile;

/**
 * Parameters for the data source profile provider `resolve` method
 */
export interface DataSourceProfileProviderParams {
  /**
   * The current root context
   */
  rootContext: RootContext;
  /**
   * The current data source
   */
  dataSource?: DiscoverDataSource;
  /**
   * The current data view
   */
  dataView?: DataView;
  /**
   * The current query
   */
  query?: Query | AggregateQuery;
}

/**
 * The resulting context object returned by the data source profile provider `resolve` method
 */
export interface DataSourceContext {
  /**
   * The category of the current data source
   */
  category: DataSourceCategory;
}

export type DataSourceProfileProvider = AsyncProfileProvider<
  DataSourceProfile,
  DataSourceProfileProviderParams,
  DataSourceContext
>;

export class DataSourceProfileService extends AsyncProfileService<
  DataSourceProfile,
  DataSourceProfileProviderParams,
  DataSourceContext
> {
  constructor() {
    super({
      profileId: 'default-data-source-profile',
      category: DataSourceCategory.Default,
    });
  }
}
