/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';

export function getIndexPatternMock(isTimebased = true) {
  const fields = [
    {
      name: '_source',
      type: '_source',
      scripted: false,
      filterable: false,
      aggregatable: false,
    },
    {
      name: '_index',
      type: 'string',
      scripted: false,
      filterable: true,
      aggregatable: false,
    },
    {
      name: 'message',
      type: 'string',
      displayName: 'message',
      scripted: false,
      filterable: false,
      aggregatable: false,
    },
    {
      name: 'extension',
      type: 'string',
      displayName: 'extension',
      scripted: false,
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'bytes',
      type: 'number',
      displayName: 'bytesDisplayName',
      scripted: false,
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'scripted',
      type: 'number',
      displayName: 'scripted',
      scripted: true,
      filterable: false,
    },
    {
      name: 'object.value',
      type: 'number',
      displayName: 'object.value',
      scripted: false,
      filterable: true,
      aggregatable: true,
    },
  ] as DataView['fields'];
  const indexPatternMock = {
    isTimeBased: () => isTimebased,
    getName: () => 'test',
    fields,
    getFormatterForField: () => ({
      convert: () => 'test',
    }),
    getFieldByName: () => {
      return fields[0];
    },
    metaFields: [],
  } as unknown as DataView;

  indexPatternMock.fields.getByName = () => fields[0];
  indexPatternMock.fields.getAll = () => fields;
  return indexPatternMock;
}
