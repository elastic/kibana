/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KBN_FIELD_TYPES } from '../../../data/public';
import { DataViewField } from '../../../data_views/public';

export enum IgnoredReason {
  IGNORE_ABOVE = 'ignore_above',
  MALFORMED = 'malformed',
  UNKNOWN = 'unknown',
}

/**
 * Returns the reason why a specific field was ignored in the response.
 * Will return undefined if the field had no ignored values in it.
 * This implementation will make some assumptions based on specific types
 * of ignored values can only happen with specific field types in Elasticsearch.
 *
 * @param field Either the data view field or the string name of it.
 * @param ignoredFields The hit._ignored value of the hit to validate.
 */
export function getIgnoredReason(
  field: DataViewField | string,
  ignoredFields: estypes.SearchHit['_ignored']
): IgnoredReason | undefined {
  const fieldName = typeof field === 'string' ? field : field.name;
  if (!ignoredFields?.includes(fieldName)) {
    return undefined;
  }

  if (typeof field === 'string') {
    return IgnoredReason.UNKNOWN;
  }

  switch (field.type) {
    case KBN_FIELD_TYPES.STRING:
      return IgnoredReason.IGNORE_ABOVE;
    case KBN_FIELD_TYPES.NUMBER:
    case KBN_FIELD_TYPES.DATE:
    case KBN_FIELD_TYPES.GEO_POINT:
    case KBN_FIELD_TYPES.GEO_SHAPE:
    case KBN_FIELD_TYPES.IP:
      return IgnoredReason.MALFORMED;
    default:
      return IgnoredReason.UNKNOWN;
  }
}
