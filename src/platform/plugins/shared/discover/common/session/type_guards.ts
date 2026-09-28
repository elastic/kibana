/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import type {
  DiscoverSessionApiEsqlTabBase,
  DiscoverSessionApiTabBase,
} from '@kbn/as-code-discover-schema';

export function isDiscoverSessionEsqlTab(
  tab: DiscoverSessionApiTabBase
): tab is DiscoverSessionApiEsqlTabBase {
  return 'data_source' in tab && tab.data_source.type === AS_CODE_ESQL_DATA_SOURCE_TYPE;
}
