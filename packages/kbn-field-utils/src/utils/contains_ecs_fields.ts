/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/common';

/**
 * The name of the field that is being used to determine if the data view contains ECS fields
 */
const ECS_FIELD_NAME = 'ecs.version';

/**
 * Helper function returning if data view field lists contains ECS information
 * @param getFieldByName function provided by DataView / Lens IndexPattern to get field by name
 */
export function containsEcsFields(getFieldByName: DataView['getFieldByName']) {
  return getFieldByName(ECS_FIELD_NAME) !== undefined;
}
