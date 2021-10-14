/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { DataViewField, KBN_FIELD_TYPES } from '../../../../data/common';

export enum IgnoredReason {
  IGNORE_ABOVE = 'ignore_above',
  MALFORMED = 'malformed',
  UNKNOWN = 'unknown',
}

// TODO: Writing unit tests

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
