/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';

export function getDataViewMock(isTimebased = true) {
  const fields = [
    {
      name: 'date',
      type: 'date',
      displayName: 'Date',
      scripted: false,
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'message',
      type: 'text',
      displayName: 'message',
      scripted: false,
      filterable: false,
      aggregatable: false,
    },
    {
      name: 'name',
      type: 'keyword',
      displayName: 'Name',
      scripted: false,
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'extension',
      type: 'keyword',
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
  const dataViewMock = {
    isTimeBased: () => isTimebased,
    getName: () => 'test',
    fields,
    getFormatterForField: () => ({
      convert: (name: string) => name,
    }),
    getFieldByName: (name: string) => {
      return fields.find((field) => field.name === name);
    },
    getIndexPattern: () => 'test',
    metaFields: [],
    timeFieldName: isTimebased ? 'date' : undefined,
    isPersisted: () => true,
  } as unknown as DataView;

  dataViewMock.fields.getByName = (name: string) => fields.find((field) => field.name === name);
  dataViewMock.fields.getAll = () => fields;
  return dataViewMock;
}
