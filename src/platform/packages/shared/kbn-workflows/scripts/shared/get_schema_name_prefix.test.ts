/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSchemaNamePrefix } from './get_schema_name_prefix';

describe('getSchemaNamePrefix', () => {
  it('should return the correct schema name prefix', () => {
    expect(getSchemaNamePrefix('search')).toBe('search');
  });
  it('should return the correct schema name prefix for a complex operation id', () => {
    expect(getSchemaNamePrefix('search.complex.operation.id')).toBe('search_complex_operation_id');
  });
  it('should return the correct schema name prefix for a operation id with a number', () => {
    expect(getSchemaNamePrefix('search-1')).toBe('search1');
  });
  it('should return the correct schema name prefix for a operation id with a dot', () => {
    expect(getSchemaNamePrefix('search.dot')).toBe('search_dot');
  });
  it('should return the correct schema name prefix for a operation id with a hyphen', () => {
    expect(getSchemaNamePrefix('search-hyphen')).toBe('search_hyphen');
  });
  it('should return the correct schema name prefix for a operation id with a camel case', () => {
    expect(getSchemaNamePrefix('searchCamelCase')).toBe('search_camel_case');
  });
  it('should return the correct schema name prefix for a operation id with a Capital Case', () => {
    expect(getSchemaNamePrefix('SearchCapitalCase')).toBe('search_capital_case');
  });
  it('should return the correct schema name prefix for a operation id with abbreviation', () => {
    expect(getSchemaNamePrefix('PrivmonBulkUploadUsersCSV')).toBe('privmon_bulk_upload_users_csv');
  });
});
