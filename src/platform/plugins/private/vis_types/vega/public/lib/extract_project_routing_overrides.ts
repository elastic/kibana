/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import type { ProjectRoutingOverrides } from '@kbn/presentation-publishing';

interface DataUrl {
  '%type%'?: string;
  query?: string;
}

interface DataObject {
  name?: string;
  url?: string | DataUrl;
}

interface VegaSpec {
  data?: DataObject | DataObject[];
  [key: string]: unknown;
}

/**
 * Extracts project routing overrides from a Vega specification.
 * Searches for ES|QL queries in the data.url objects and extracts project routing information.
 */
export function extractProjectRoutingOverrides(spec: VegaSpec): ProjectRoutingOverrides {
  const overrides: Array<{ name?: string; value: string }> = [];

  const processDataObject = (dataObj: DataObject) => {
    if (dataObj.url && typeof dataObj.url === 'object') {
      const dataUrl = dataObj.url as DataUrl;
      // Check if this is an ES|QL data source
      if (dataUrl['%type%'] === 'esql' && typeof dataUrl.query === 'string') {
        const projectRoutingValue = getProjectRoutingFromEsqlQuery(dataUrl.query);
        if (projectRoutingValue) {
          overrides.push({
            name: dataObj.name,
            value: projectRoutingValue,
          });
        }
      }
    }
  };

  // Process data field
  if (spec.data) {
    if (Array.isArray(spec.data)) {
      spec.data.forEach(processDataObject);
    } else if (typeof spec.data === 'object') {
      processDataObject(spec.data);
    }
  }

  return overrides.length > 0 ? overrides : undefined;
}
