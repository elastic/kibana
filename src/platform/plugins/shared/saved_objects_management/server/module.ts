/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import { CapabilitiesProvider, SavedObjectsClient, Route } from '@kbn/core-di-server';
import { capabilitiesProvider } from './capabilities_provider';
import {
  BulkDeleteRoute,
  bulkGetClientFactory,
  BulkGetRoute,
  findClientFactory,
  FindRoute,
  GetAllowedTypesRoute,
  relationshipsClientFactory,
  RelationshipsRoute,
  scrollCountClientFactory,
  ScrollCountRoute,
} from './routes';
import { SavedObjectsManagement } from './services';

export const module = new ContainerModule(({ bind }) => {
  bind(CapabilitiesProvider).toConstantValue(capabilitiesProvider);
  bind(SavedObjectsManagement).toSelf().inSingletonScope();

  bind(Route).toConstantValue(BulkDeleteRoute);
  bind(Route).toConstantValue(BulkGetRoute);
  bind(Route).toConstantValue(FindRoute);
  bind(Route).toConstantValue(GetAllowedTypesRoute);
  bind(Route).toConstantValue(RelationshipsRoute);
  bind(Route).toConstantValue(ScrollCountRoute);

  bind(SavedObjectsClient)
    .toResolvedValue(bulkGetClientFactory, bulkGetClientFactory.inject)
    .inRequestScope()
    .whenParentIs(BulkGetRoute);
  bind(SavedObjectsClient)
    .toResolvedValue(findClientFactory, findClientFactory.inject)
    .inRequestScope()
    .whenParentIs(FindRoute);
  bind(SavedObjectsClient)
    .toResolvedValue(relationshipsClientFactory, relationshipsClientFactory.inject)
    .inRequestScope()
    .whenParentIs(RelationshipsRoute);
  bind(SavedObjectsClient)
    .toResolvedValue(scrollCountClientFactory, scrollCountClientFactory.inject)
    .inRequestScope()
    .whenParentIs(ScrollCountRoute);
});
