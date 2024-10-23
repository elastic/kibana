/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SurrDocType } from '../services/context';

/**
 * Get the searchAfter query value for elasticsearch
 * When there are already documents available, which means successors or predecessors
 * were already fetched, the new searchAfter for the next fetch has to be the sort value
 * of the first (prececessor), or last (successor) of the list
 */
export function getEsQuerySearchAfter(
  type: SurrDocType,
  rows: DataTableRecord[],
  anchor: DataTableRecord
): estypes.SortResults {
  if (rows.length) {
    // already surrounding docs -> first or last record  is used
    const afterTimeRecIdx = type === SurrDocType.SUCCESSORS && rows.length ? rows.length - 1 : 0;
    const afterTimeDocRaw = rows[afterTimeRecIdx].raw;
    return [
      afterTimeDocRaw.sort?.[0] as string | number,
      afterTimeDocRaw.sort?.[1] as string | number,
    ];
  }
  // ES search_after also works when number is provided as string
  return [anchor.raw.sort?.[0] as string | number, anchor.raw.sort?.[1] as string | number];
}
