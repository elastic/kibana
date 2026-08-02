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
import { escapeStringValue, getESQLResults, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { buildSearchBody } from '@kbn/unified-doc-viewer-plugin/public';
import type { ExpandedDocRef } from '../../../../common/expanded_doc';

export interface FetchExpandedDocParams {
  ref: ExpandedDocRef;
  dataView: DataView;
  /** The current query's ES|QL text, or `undefined` when it is a data view query */
  esqlQueryText: string | undefined;
  data: DataPublicPluginStart;
  abortSignal: AbortSignal;
}

/**
 * Fetches a single document by reference, for restoring a flyout from a link when the document
 * is not part of the current results. Returns `undefined` when it no longer exists or is not
 * accessible.
 */
export const fetchExpandedDoc = async (
  params: FetchExpandedDocParams
): Promise<DataTableRecord | undefined> =>
  params.esqlQueryText === undefined ? fetchDslExpandedDoc(params) : fetchEsqlExpandedDoc(params);

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
  ref,
  esqlQueryText,
  data,
  abortSignal,
}: FetchExpandedDocParams): Promise<DataTableRecord | undefined> => {
  // Backing indices of a data stream cannot be queried directly, so this reuses the index
  // pattern the current query already resolves against (e.g. `logs-*`) rather than `ref.index`,
  // and filters for the specific document instead. Deliberately a standalone query rather than
  // the user's with a filter applied, so the document is found regardless of the time range,
  // sort, limit, and filtering of the current results.
  const indexPattern = getIndexPatternFromESQLQuery(esqlQueryText);
  const esqlQuery = `FROM ${indexPattern} METADATA _index, _id
| WHERE _index == ${escapeStringValue(ref.index)} AND _id == ${escapeStringValue(ref.id)}
| LIMIT 1`;

  const { response } = await getESQLResults({
    esqlQuery,
    search: data.search.search,
    signal: abortSignal,
  });
  const [values] = response.values;

  if (!values) {
    return undefined;
  }

  // Matches the shape ES|QL results take when the main search produces them, where the raw and
  // flattened forms are both the row keyed by column name
  const row: DatatableRow = zipObject(
    response.columns.map(({ name }) => name),
    values
  );

  return { id: getDocId({ _index: ref.index, _id: ref.id }), raw: row, flattened: row };
};
