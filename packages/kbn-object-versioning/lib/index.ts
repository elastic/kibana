/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { initTransform } from './object_transform';

export {
  getTransforms as getContentManagmentServicesTransforms,
  compile as compileServiceDefinitions,
} from './content_management_services_versioning';

export type { GetTransformsFn as ContentManagementGetTransformsFn } from './content_management_services_versioning';

export type {
  Version,
  VersionableObject,
  ObjectMigrationDefinition,
  ObjectTransform,
  ObjectTransforms,
  TransformReturn,
} from './types';

export type {
  ServiceTransforms as ContentManagementServiceTransforms,
  ServicesDefinition as ContentManagementServicesDefinition,
  ServiceDefinitionVersioned as ContentManagementServiceDefinitionVersioned,
} from './content_management_types';
