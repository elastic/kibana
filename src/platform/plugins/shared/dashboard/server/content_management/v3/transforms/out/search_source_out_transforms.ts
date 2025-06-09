/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import {
  parseSearchSourceJSON,
  type Query,
  type SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import { DashboardAttributes } from '../../types';

const kibanaSavedObjectMetaSchema = schema.object({
  searchSourceJSON: schema.maybe(schema.string()),
});
type KibanaSavedObjectMeta = TypeOf<typeof kibanaSavedObjectMetaSchema>;

const isKibanaSavedObjectMeta = (
  kibanaSavedObjectMeta: unknown
): kibanaSavedObjectMeta is KibanaSavedObjectMeta => {
  try {
    return Boolean(kibanaSavedObjectMetaSchema.validate(kibanaSavedObjectMeta));
  } catch {
    return false;
  }
};

export function transformSearchSourceOut(kibanaSavedObjectMeta: unknown): {
  kibanaSavedObjectMeta?: DashboardAttributes['kibanaSavedObjectMeta'];
} {
  if (!isKibanaSavedObjectMeta(kibanaSavedObjectMeta)) return {};

  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON) {
    return {};
  }
  // Dashboards do not yet support ES|QL (AggregateQuery) in the search source
  return {
    kibanaSavedObjectMeta: {
      searchSource: parseSearchSourceJSON(searchSourceJSON) as Omit<
        SerializedSearchSourceFields,
        'query'
      > & { query?: Query },
    },
  };
}
