/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fileToJson } from '../../util/json';
import { REMOVED_TYPES_JSON_PATH } from './constants';

/**
 * Gets the removed types from the removed_types.json file.
 */
export async function getRemovedTypes(): Promise<string[]> {
  return (await fileToJson(REMOVED_TYPES_JSON_PATH)) as string[];
}
