/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { serviceGroupsRoute } from './get_service_groups';
import { serviceGroupRoute } from './get_service_group';
import { serviceGroupSaveRoute } from './save_service_group';
import { serviceGroupDeleteRoute } from './delete_service_group';
import { serviceGroupServicesRoute } from './lookup_services';
import { serviceGroupCountsRoute } from './service_group_counts';

export const serviceGroupsRouteDefinitions = {
  list: serviceGroupsRoute,
  get: serviceGroupRoute,
  save: serviceGroupSaveRoute,
  delete: serviceGroupDeleteRoute,
  services: serviceGroupServicesRoute,
  counts: serviceGroupCountsRoute,
};

export type { ServiceGroupsResponse } from './get_service_groups';
export type { ServiceGroupResponse } from './get_service_group';
export type { SaveServiceGroupResponse } from './save_service_group';
export type { LookupServicesResponse, LookupServicesRouteResponse } from './lookup_services';
export type { ServiceGroupCounts } from './service_group_counts';
