/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ObjectMigrationDefinition,
  ContentManagementServicesDefinition as ServicesDefinition,
  Version,
} from '@kbn/object-versioning';

import { cmServiceDefinition as cmV1 } from './v1/cm_services';
import { cmServiceDefinition as cmV2 } from './v2/cm_services';
import { embeddableVersionableObject as embeddableV1 } from './v1/cm_services';
import { embeddableVersionableObject as embeddableV2 } from './v2/cm_services';

export const cmServicesDefinition: { [version: Version]: ServicesDefinition } = {
  1: cmV1,
  2: cmV2,
};

export const embeddableMigrationDefinition: ObjectMigrationDefinition = {
  1: embeddableV1,
  2: embeddableV2,
};
