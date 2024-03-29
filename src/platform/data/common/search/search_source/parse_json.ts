/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InvalidJSONProperty } from '@kbn/kibana-utils-plugin/common';
import { SerializedSearchSourceFields } from './types';

export const parseSearchSourceJSON = (searchSourceJSON: string) => {
  // if we have a searchSource, set its values based on the searchSourceJson field
  let searchSourceValues: SerializedSearchSourceFields;
  try {
    searchSourceValues = JSON.parse(searchSourceJSON);
  } catch (e) {
    throw new InvalidJSONProperty(
      `Invalid JSON in search source. ${e.message} JSON: ${searchSourceJSON}`
    );
  }

  // This detects a scenario where documents with invalid JSON properties have been imported into the saved object index.
  // (This happened in issue #20308)
  if (!searchSourceValues || typeof searchSourceValues !== 'object') {
    throw new InvalidJSONProperty('Invalid JSON in search source.');
  }

  return searchSourceValues;
};
