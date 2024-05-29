/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getESQLMetadataFields } from './get_esql_metadata_fields';

describe('get_esql_metadata_fields', () => {
  it('should return metadata columns', () => {
    const query = 'from some_index metadata _id, _index';
    const result = getESQLMetadataFields(query);
    expect(result).toEqual(['_id', '_index']);
  });
  it('should return empty array if no metadata columns', () => {
    const query = 'from some_index';
    const result = getESQLMetadataFields(query);
    expect(result).toEqual([]);
  });
  it('should also return empty array if no FROM source command', () => {
    const query = 'ROW col1="value1", col2="value2"';
    const result = getESQLMetadataFields(query);
    expect(result).toEqual([]);
  });
});
