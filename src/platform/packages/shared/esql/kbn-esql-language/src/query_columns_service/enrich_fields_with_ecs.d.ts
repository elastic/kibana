/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
export interface ECSMetadata {
  [key: string]: {
    type?: string;
    source?: string;
    description?: string;
  };
}
/**
 * Returns columns with the metadata/description (e.g ECS info)
 * if available
 *
 * @param columns
 * @param fieldsMetadata
 * @returns
 */
export declare function enrichFieldsWithECSInfo(
  columns: Array<Omit<ESQLFieldWithMetadata, 'metadata'>>,
  ecsMetadataCache?: ECSMetadata
): ESQLFieldWithMetadata[];
