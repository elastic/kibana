/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewLazy } from '@kbn/data-views-plugin/common';
import type { SearchRequest } from './fetch';
import type { EsQuerySortValue } from '../..';
export declare function queryToFields({
  dataView,
  sort,
  request,
}: {
  dataView: DataViewLazy;
  sort?: EsQuerySortValue | EsQuerySortValue[];
  request: SearchRequest;
}): Promise<Record<string, import('@kbn/data-views-plugin/common').DataViewField>>;
