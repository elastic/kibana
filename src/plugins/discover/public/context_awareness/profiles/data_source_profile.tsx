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
import { AsyncProfileService } from '../profile_service';
import { Profile } from '../types';

export enum DataSourceCategory {
  Logs = 'logs',
  Default = 'default',
}

export interface DataSourceProfileProviderParams {
  dataSource?: DiscoverDataSource;
  dataView?: DataView;
  query?: Query | AggregateQuery;
}

export interface DataSourceContext {
  category: DataSourceCategory;
}

export type DataSourceProfile = Profile;

export const dataSourceProfileService = new AsyncProfileService<
  DataSourceProfile,
  DataSourceProfileProviderParams,
  DataSourceContext
>();

export type DataSourceProfileProvider = Parameters<
  typeof dataSourceProfileService.registerProvider
>[0];
