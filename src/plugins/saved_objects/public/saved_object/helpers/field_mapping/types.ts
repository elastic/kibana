/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ES_FIELD_TYPES } from '../../../../../data/public';

/** @public */
export interface FieldMappingSpec {
  type: ES_FIELD_TYPES;
  _serialize?: (mapping: any) => string | undefined;
  _deserialize?: (mapping: string) => any | undefined;
}

/** @public */
export type MappingObject = Record<string, FieldMappingSpec>;
