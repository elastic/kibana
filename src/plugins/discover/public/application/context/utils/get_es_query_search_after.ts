/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EsQuerySearchAfter } from '@kbn/data-plugin/common';
import { SurrDocType } from '../services/context';
import type { DataTableRecord } from '../../../types';

/**
 * Get the searchAfter query value for elasticsearch
 * When there are already documents available, which means successors or predecessors
 * were already fetched, the new searchAfter for the next fetch has to be the sort value
 * of the first (prececessor), or last (successor) of the list
 */
export function getEsQuerySearchAfter(
  type: SurrDocType,
  documents: DataTableRecord[],
  timeFieldName: string,
  anchor: DataTableRecord
): EsQuerySearchAfter {
  if (documents.length) {
    // already surrounding docs -> first or last record  is used
    const afterTimeRecIdx =
      type === SurrDocType.SUCCESSORS && documents.length ? documents.length - 1 : 0;
    const afterTimeDocRaw = documents[afterTimeRecIdx].raw;
    return [
      afterTimeDocRaw.sort?.[0] as string | number,
      afterTimeDocRaw.sort?.[1] as string | number,
    ];
  }
  // ES search_after also works when number is provided as string
  return [anchor.raw.sort?.[0] as string | number, anchor.raw.sort?.[1] as string | number];
}
