/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';

export const showTimeFieldColumn = ({
  uiSettings,
  query,
}: {
  uiSettings: IUiSettingsClient;
  query?: AggregateQuery | Query;
}): boolean => {
  if (uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false)) {
    return false;
  }
  if (query && isOfAggregateQueryType(query) && hasTransformationalCommand(query.esql)) {
    return false;
  }
  return true;
};
