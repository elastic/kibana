/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const pluginName = 'index_pattern_editor';
export const MAX_NUMBER_OF_MATCHING_INDICES = 100;
export const CONFIG_ROLLUPS = 'rollups:enableIndexPatterns';

// This isn't ideal. We want to avoid searching for 20 indices
// then filtering out the majority of them because they are system indices.
// We'd like to filter system indices out in the query
// so if we can accomplish that in the future, this logic can go away
export const ESTIMATED_NUMBER_OF_SYSTEM_INDICES = 100;
export const MAX_SEARCH_SIZE = MAX_NUMBER_OF_MATCHING_INDICES + ESTIMATED_NUMBER_OF_SYSTEM_INDICES;
