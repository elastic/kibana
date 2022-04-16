/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggConfig, IndexPatternField } from '@kbn/data-plugin/public';

type AggTypeFieldFilter = (field: IndexPatternField, aggConfig: IAggConfig) => boolean;

const filters: AggTypeFieldFilter[] = [
  /**
   * Check index pattern aggregation restrictions
   * and limit available fields for a given aggType based on that.
   */
  (field, aggConfig) => {
    const indexPattern = aggConfig.getIndexPattern();
    const aggRestrictions = indexPattern.getAggregationRestrictions();

    if (!aggRestrictions) {
      return true;
    }

    const aggName = aggConfig.type && aggConfig.type.name;
    const aggFields = aggRestrictions[aggName];
    return !!aggFields && !!aggFields[field.name];
  },
];

export function filterAggTypeFields(fields: IndexPatternField[], aggConfig: IAggConfig) {
  const allowedAggTypeFields = fields.filter((field) => {
    const isAggTypeFieldAllowed = filters.every((filter) => filter(field, aggConfig));
    return isAggTypeFieldAllowed;
  });
  return allowedAggTypeFields;
}
