/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Query,
  type SerializedSearchSourceFields,
  parseSearchSourceJSON,
} from '@kbn/data-plugin/common';
import { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { DashboardAttributes } from '../../types';

export function transformSearchSourceOut(
  kibanaSavedObjectMeta: DashboardSavedObjectAttributes['kibanaSavedObjectMeta']
): DashboardAttributes['kibanaSavedObjectMeta'] {
  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON) {
    return {};
  }
  // Dashboards do not yet support ES|QL (AggregateQuery) in the search source
  return {
    searchSource: parseSearchSourceJSON(searchSourceJSON) as Omit<
      SerializedSearchSourceFields,
      'query'
    > & { query?: Query },
  };
}
