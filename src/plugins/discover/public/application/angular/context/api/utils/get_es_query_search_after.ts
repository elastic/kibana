/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SurrDocType, EsHitRecordList, EsHitRecord } from '../context';

export type EsQuerySearchAfter = [string | number, string | number];

/**
 * Get the searchAfter query value for elasticsearch
 * When there are already documents available, which means successors or predecessors
 * were already fetched, the new searchAfter for the next fetch has to be the sort value
 * of the first (prececessor), or last (successor) of the list
 */
export function getEsQuerySearchAfter(
  type: SurrDocType,
  documents: EsHitRecordList,
  timeFieldName: string,
  anchor: EsHitRecord,
  nanoSeconds: string,
  useNewFieldsApi?: boolean
): EsQuerySearchAfter {
  if (documents.length) {
    // already surrounding docs -> first or last record  is used
    const afterTimeRecIdx = type === 'successors' && documents.length ? documents.length - 1 : 0;
    const afterTimeDoc = documents[afterTimeRecIdx];
    let afterTimeValue = afterTimeDoc.sort[0];
    if (nanoSeconds) {
      afterTimeValue = useNewFieldsApi
        ? afterTimeDoc.fields[timeFieldName][0]
        : afterTimeDoc._source[timeFieldName];
    }
    return [afterTimeValue, afterTimeDoc.sort[1]];
  }
  // if data_nanos adapt timestamp value for sorting, since numeric value was rounded by browser
  // ES search_after also works when number is provided as string
  const searchAfter = new Array(2) as EsQuerySearchAfter;
  searchAfter[0] = anchor.sort[0];
  if (nanoSeconds) {
    searchAfter[0] = useNewFieldsApi
      ? anchor.fields[timeFieldName][0]
      : anchor._source[timeFieldName];
  }
  searchAfter[1] = anchor.sort[1];
  return searchAfter;
}
