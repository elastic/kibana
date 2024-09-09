/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContentManagementServicesDefinition as ServicesDefinition,
  Version,
} from '@kbn/object-versioning';

// We export the versionned service definition from this file and not the barrel to avoid adding
// the schemas in the "public" js bundle

import { serviceDefinition as v1 } from './v1/cm_services';

export const cmServicesDefinition: { [version: Version]: ServicesDefinition } = {
  1: v1,
};
