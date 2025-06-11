/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import createContainer from 'constate';

interface UseDataSourcesParams {
  tracesIndexPattern: string;
  apmErrorsIndexPattern: string;
}

export interface DataSources {
  logs: string;
  apm: {
    errors: string;
  };
}

const useDataSources = ({ tracesIndexPattern, apmErrorsIndexPattern }: UseDataSourcesParams) => {
  return {
    logs: tracesIndexPattern, // TODO add logs index pattern when available
    apm: {
      errors: apmErrorsIndexPattern,
      traces: tracesIndexPattern,
    },
  };
};

export const [DataSourcesProvider, useDataSourcesContext] = createContainer(useDataSources);
