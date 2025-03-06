/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ResourceFields } from '../../..';
import * as constants from '../constants';

const AVAILABLE_RESOURCE_FIELDS: Array<keyof ResourceFields> = [
  constants.SERVICE_NAME_FIELD,
  constants.CONTAINER_NAME_FIELD,
  constants.HOST_NAME_FIELD,
  constants.ORCHESTRATOR_NAMESPACE_FIELD,
  constants.CLOUD_INSTANCE_ID_FIELD,
];

export const getAvailableResourceFields = (resourceDoc: ResourceFields) =>
  AVAILABLE_RESOURCE_FIELDS.filter((fieldName) => Boolean(resourceDoc[fieldName]));
