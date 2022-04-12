/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubFieldSpecMap, stubLogstashFieldSpecMap } from './field.stub';
import { createStubDataView } from './data_views/data_view.stub';
export { createStubDataView } from './data_views/data_view.stub';
import { SavedObject } from '../../../core/types';
import { DataViewAttributes } from './types';

export const stubDataView = createStubDataView({
  spec: {
    id: 'logstash-*',
    fields: stubFieldSpecMap,
    title: 'logstash-*',
    timeFieldName: '@timestamp',
  },
});

export const stubDataViewWithoutTimeField = createStubDataView({
  spec: {
    id: 'logstash-*',
    fields: stubFieldSpecMap,
    title: 'logstash-*',
  },
});

export const stubLogstashDataView = createStubDataView({
  spec: {
    id: 'logstash-*',
    title: 'logstash-*',
    timeFieldName: 'time',
    fields: stubLogstashFieldSpecMap,
  },
});

export function stubbedSavedObjectDataView(
  id: string | null = null
): SavedObject<DataViewAttributes> {
  return {
    id: id ?? '',
    type: 'index-pattern',
    attributes: {
      timeFieldName: 'time',
      fields: JSON.stringify(stubLogstashFieldSpecMap),
      title: 'title',
    },
    version: '2',
    references: [],
  };
}

export const stubbedSavedObjectIndexPattern = stubbedSavedObjectDataView;
