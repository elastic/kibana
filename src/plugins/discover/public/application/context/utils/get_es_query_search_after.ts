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
  anchor: DataTableRecord,
  nanoSeconds: string,
  useNewFieldsApi?: boolean
): EsQuerySearchAfter {
  if (documents.length) {
    // already surrounding docs -> first or last record  is used
    const afterTimeRecIdx =
      type === SurrDocType.SUCCESSORS && documents.length ? documents.length - 1 : 0;
    const afterTimeDoc = documents[afterTimeRecIdx];
    const afterTimeDocRaw = afterTimeDoc.raw;
    let afterTimeValue = afterTimeDocRaw.sort?.[0] as string | number;
    if (nanoSeconds) {
      afterTimeValue = useNewFieldsApi
        ? afterTimeDocRaw.fields?.[timeFieldName][0]
        : afterTimeDocRaw._source?.[timeFieldName];
    }
    return [afterTimeValue, afterTimeDoc.raw.sort?.[1] as string | number];
  }
  // if data_nanos adapt timestamp value for sorting, since numeric value was rounded by browser
  // ES search_after also works when number is provided as string
  const searchAfter = new Array(2) as EsQuerySearchAfter;
  searchAfter[0] = anchor.raw.sort?.[0] as string | number;
  if (nanoSeconds) {
    searchAfter[0] = useNewFieldsApi
      ? anchor.raw.fields?.[timeFieldName][0]
      : anchor.raw._source?.[timeFieldName];
  }
  searchAfter[1] = anchor.raw.sort?.[1] as string | number;
  return searchAfter;
}
