/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';

/**
 * parses ES|QL query and returns array of indices
 */
export const getIndexListFromEsqlQuery = (query: string | undefined): string[] => {
  const indexString = getIndexPatternFromESQLQuery(query);
  if (!indexString) {
    return [];
  }
  return indexString.split(',').map((index) => index.trim());
};
