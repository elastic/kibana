/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-common';
import type { ImportStateMap } from './types';
/**
 * Takes an array of saved objects and returns an importStateMap of randomly-generated new IDs.
 *
 * @param objects The saved objects to generate new IDs for.
 */
export declare const regenerateIds: (objects: SavedObject[]) => ImportStateMap;
