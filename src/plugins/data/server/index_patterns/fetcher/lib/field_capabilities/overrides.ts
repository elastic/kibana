/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { merge } from 'lodash';
import { FieldDescriptor } from '../../index_patterns_fetcher';

const OVERRIDES: Record<string, Partial<FieldDescriptor>> = {
  _source: { type: '_source' },
  _index: { type: 'string' },
  _type: { type: 'string' },
  _id: { type: 'string' },
  _timestamp: {
    type: 'date',
    searchable: true,
    aggregatable: true,
  },
  _score: {
    type: 'number',
    searchable: false,
    aggregatable: false,
  },
};

/**
 *  Merge overrides for specific metaFields
 *
 *  @param  {FieldDescriptor} field
 *  @return {FieldDescriptor}
 */
export function mergeOverrides(field: FieldDescriptor): FieldDescriptor {
  if (OVERRIDES.hasOwnProperty(field.name)) {
    return merge(field, OVERRIDES[field.name]);
  } else {
    return field;
  }
}
