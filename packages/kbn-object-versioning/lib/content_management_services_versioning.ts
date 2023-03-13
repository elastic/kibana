/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServicesDefinition as ContentManagementServicesDefinition } from '@kbn/content-management-plugin/common';
import { definitionSchema } from './content_management_services_schemas';

import { Version } from './types';
import { validateObj } from './utils';

export const getTransforms = (
  definition: ContentManagementServicesDefinition,
  requestVersion: Version
) => {
  const error = validateObj(definition, definitionSchema);
  if (error !== null) {
    throw new Error(`Invalid content management services definition. [${error}]`);
  }
  return 'todo';
};
