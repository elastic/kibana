/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { DiscoverDataSource } from '../../../common/data_sources';
import { AsyncProfileProvider, AsyncProfileService } from '../profile_service';
import { Profile } from '../types';

export enum DataSourceCategory {
  Logs = 'logs',
  Default = 'default',
}

export type DataSourceProfile = Profile;

export interface DataSourceProfileProviderParams {
  dataSource?: DiscoverDataSource;
  dataView?: DataView;
  query?: Query | AggregateQuery;
}

export interface DataSourceContext {
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
