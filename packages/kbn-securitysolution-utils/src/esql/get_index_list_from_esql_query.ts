/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getIndexPatternFromESQLQueryDeprecated } from '@kbn/esql-utils';

/**
 * parses ES|QL query and returns array of indices
 */
// this should be changed to use the new getIndexPatternFromESQLQuery function
export const getIndexListFromEsqlQuery = (query: string | undefined): string[] => {
  const indexString = getIndexPatternFromESQLQueryDeprecated(query);

  return getIndexListFromIndexString(indexString);
};

/**
 * transforms sting of indices, separated by commas to array
 * index*, index2* => [index*, index2*]
 */
export const getIndexListFromIndexString = (indexString: string | undefined): string[] => {
  if (!indexString) {
    return [];
  }
  return indexString.split(',').map((index) => index.trim());
};
