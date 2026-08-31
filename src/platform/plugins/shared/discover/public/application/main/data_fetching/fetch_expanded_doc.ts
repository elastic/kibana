/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom } from 'rxjs';
import { zipObject } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { buildDataTableRecord, getDocId } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { esql } from '@elastic/esql';
import { getESQLResults, injectWhereClauseAfterSourceCommand } from '@kbn/esql-utils';
import { buildSearchBody } from '@kbn/unified-doc-viewer-plugin/public';
import type { ExpandedDocRef } from '../utils/expanded_doc';

export interface FetchExpandedDocParams {
  ref: ExpandedDocRef;
  dataView: DataView;
  /** The current query's ES|QL text, or `undefined` when it is a data view query */
  esqlQueryText: string | undefined;
  data: DataPublicPluginStart;
  abortSignal: AbortSignal;
}

/** Fetches a linked document that is absent from the current results. */
export const fetchExpandedDoc = async (
  params: FetchExpandedDocParams
): Promise<DataTableRecord | undefined> =>
  params.esqlQueryText === undefined
    ? fetchDslExpandedDoc(params)
    : fetchEsqlExpandedDoc({ ...params, esqlQueryText: params.esqlQueryText });

const fetchDslExpandedDoc = async ({
  ref,
  dataView,
  data,
  abortSignal,
}: FetchExpandedDocParams): Promise<DataTableRecord | undefined> => {
  const response = await lastValueFrom(
    data.search.search(
      {
        params: {
          index: dataView.getIndexPattern(),
          ...(ref.routing ? { routing: ref.routing } : {}),
          ...buildSearchBody(ref.id, ref.index, dataView),
        },
      },
      { abortSignal }
    )
  );
  const rawHit = response.rawResponse.hits?.hits?.[0];

  return rawHit ? buildDataTableRecord(rawHit, dataView) : undefined;
};

const fetchEsqlExpandedDoc = async ({
  ref: { id, index },
  esqlQueryText,
  data,
  abortSignal,
}: FetchExpandedDocParams & { esqlQueryText: string }): Promise<DataTableRecord | undefined> => {
  const whereClause = esql.exp`_index == ${index} AND _id == ${id}`.toString();
  const esqlQuery = esql(injectWhereClauseAfterSourceCommand(esqlQueryText, whereClause))
    .limit(1)
    .print('basic');
  const { response } = await getESQLResults({
    esqlQuery,
    search: data.search.search,
    signal: abortSignal,
  });
  const [rowValues] = response.values;

  if (!rowValues) {
    return undefined;
  }

  // Match the row shape produced by the main ES|QL search.
  const row: DatatableRow = zipObject(
    response.columns.map(({ name }) => name),
    rowValues
  );

  return { id: getDocId({ _index: index, _id: id }), raw: row, flattened: row };
};
