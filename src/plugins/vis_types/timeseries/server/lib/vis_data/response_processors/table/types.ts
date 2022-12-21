/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createFieldsFetcher } from '../../../search_strategies/lib/fields_fetcher';

import type { ProcessorFunction } from '../../build_processor_function';
import type { TableSearchRequestMeta } from '../../request_processors/table/types';
import type { Panel, Series, PanelData } from '../../../../../common/types';

export interface TableResponseProcessorsParams {
  response: {
    aggregations: Record<string, any>;
  };
  panel: Panel;
  series: Series;
  meta: TableSearchRequestMeta;
  extractFields: ReturnType<typeof createFieldsFetcher>;
}

export type TableSearchResponse = Array<
  Partial<PanelData> &
    Partial<{
      slope: number;
      last: number | string | null;
    }>
>;

export type TableResponseProcessorsFunction = ProcessorFunction<
  TableResponseProcessorsParams,
  TableSearchResponse
>;
