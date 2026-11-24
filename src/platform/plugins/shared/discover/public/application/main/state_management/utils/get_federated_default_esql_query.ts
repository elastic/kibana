/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shouldBeQuotedSource } from '@kbn/esql-language';

const quoteSource = (source: string) => (shouldBeQuotedSource(source) ? `"${source}"` : source);

/**
 * ES|QL a first tab should run when the only data is a federated dataset.
 * Local and remote indices keep the profile or space default.
 */
export const getFederatedDefaultEsqlQuery = ({
  hasLocalOrRemoteESData,
  datasetName,
}: {
  hasLocalOrRemoteESData: boolean;
  datasetName: string | undefined;
}): string | undefined => {
  const name = datasetName?.trim();
  if (hasLocalOrRemoteESData || !name) {
    return undefined;
  }

  return `FROM ${quoteSource(name)}`;
};

/**
 * True when this ES|QL text is Discover's generated logs default, including the
 * `@timestamp` sort added from the data view. A query the user wrote returns false.
 */
export const isGeneratedEsqlDefault = (
  esql: string | undefined,
  profileQuery: string | undefined
): boolean => {
  const query = esql?.trim();
  const profile = profileQuery?.trim();
  if (!query || !profile) {
    return false;
  }

  return query === profile || query === `${profile} | SORT @timestamp DESC`;
};

/**
 * The data view default appends this sort even when the profile query is not loaded yet.
 * A dataset has no `@timestamp` column, so that generated text cannot be the opening query.
 */
export const isGeneratedTimeSortedEsql = (esql: string | undefined): boolean =>
  /^FROM [^|]+ \| SORT @timestamp DESC$/.test(esql?.trim() ?? '');

const GENERATED_OPENING_ESQL =
  /^FROM [^|]+(?: \| SORT \S+ DESC)?(?: \| WHERE \S+ >= \?_tstart AND \S+ <= \?_tend)?$/;

/**
 * True for a solution's generated opening query: a bare FROM, a time sort, or the
 * time-field filter Discover adds when the field is not @timestamp.
 */
export const isGeneratedOpeningEsql = (
  esql: string | undefined,
  profileQuery?: string
): boolean => {
  const query = esql?.trim();
  if (!query) {
    return false;
  }

  return isGeneratedEsqlDefault(query, profileQuery) || GENERATED_OPENING_ESQL.test(query);
};
