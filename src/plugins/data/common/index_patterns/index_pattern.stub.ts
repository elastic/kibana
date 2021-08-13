/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubFieldSpecMap, stubLogstashFieldSpecMap } from './field.stub';
import { createStubIndexPattern } from './index_patterns/index_pattern.stub';
export { createStubIndexPattern } from './index_patterns/index_pattern.stub';
import { SavedObject } from '../../../../core/types';
import { IndexPatternAttributes } from '../types';

export const stubIndexPattern = createStubIndexPattern({
  spec: {
    id: 'logstash-*',
    fields: stubFieldSpecMap,
    title: 'logstash-*',
    timeFieldName: '@timestamp',
  },
});

export const stubIndexPatternWithoutTimeField = createStubIndexPattern({
  spec: {
    id: 'logstash-*',
    fields: stubFieldSpecMap,
    title: 'logstash-*',
  },
});

export const stubLogstashIndexPattern = createStubIndexPattern({
  spec: {
    id: 'logstash-*',
    title: 'logstash-*',
    timeFieldName: 'time',
    fields: stubLogstashFieldSpecMap,
  },
});

export function stubbedSavedObjectIndexPattern(
  id: string | null = null
): SavedObject<IndexPatternAttributes> {
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
