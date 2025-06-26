/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_RUNTIME_FIELD_SIZE } from '.';
import { createGroupFilter } from './helpers';

const selectedGroup = 'host.name';
describe('createGroupFilter', () => {
  it('returns an array of Filter objects with correct meta and query properties when values and selectedGroup are truthy', () => {
    const values = ['host1', 'host2'];
    const result = createGroupFilter(selectedGroup, values);
    expect(result).toHaveLength(3);
    expect(result[0].meta.key).toBe(selectedGroup);
    expect(result[0].query.script.script.params.field).toBe(selectedGroup);
    expect(result[0].query.script.script.params.size).toBe(values.length);
    expect(result[1].meta.key).toBe(selectedGroup);
    expect(result[1].query.match_phrase[selectedGroup].query).toBe(values[0]);
    expect(result[2].meta.key).toBe(selectedGroup);
    expect(result[2].query.match_phrase[selectedGroup].query).toBe(values[1]);
  });

  it('returns an empty array when values is an empty array and selectedGroup is truthy', () => {
    const result = createGroupFilter(selectedGroup, []);
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when values is null and selectedGroup is truthy', () => {
    const result = createGroupFilter(selectedGroup, null);
    expect(result).toHaveLength(0);
  });

  it('returns filter without script key when selectedGroup is included in multiValueFields', () => {
    const multiValueFields = ['vulnerability.id'];
    const selectedGroupMock = 'vulnerability.id';
    const cveMockData = ['CVE-2021-12345', 'CVE-2021-56789'];
    const result = createGroupFilter(selectedGroupMock, cveMockData, multiValueFields);
    const mockResponse = {
      source: `doc[params['field']].size() <  ${MAX_RUNTIME_FIELD_SIZE}`,
      params: { field: 'vulnerability.id', size: 2 },
    };

    expect(result[0].query.script.script).toEqual(mockResponse);
  });

  it('returns filter with script key when selectedGroup is not included in multiValueFields', () => {
    const multiValueFields = ['vulnerability.id'];
    const selectedGroupMock = 'vulnerability.title';
    const cveMockData = ['CVE-2021-12345', 'CVE-2021-56789'];

    const mockResponse = {
      source: "doc[params['field']].size()==params['size']",
      params: { field: 'vulnerability.title', size: 2 },
    };
    const result = createGroupFilter(selectedGroupMock, cveMockData, multiValueFields);
    expect(result[0].query.script.script).toEqual(mockResponse);
  });
});
