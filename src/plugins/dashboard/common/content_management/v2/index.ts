/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  serviceDefinition as serviceDefinitionV2,
  dashboardSavedObjectSchema as dashboardSOSchemaV2,
  dashboardAttributesSchema as dashboardAttributesSchemaV2,
} from './cm_services';

export * from '../v1/types'; // no changes made to types from v1 to v2
