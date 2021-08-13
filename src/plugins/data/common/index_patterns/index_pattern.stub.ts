/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubFieldSpecMap } from './field.stub';
import { createStubIndexPattern } from './index_patterns/index_pattern.stub';

export { createStubIndexPattern } from './index_patterns/index_pattern.stub';
export const stubIndexPattern = createStubIndexPattern({
  spec: {
    id: 'logstash-*',
    fields: stubFieldSpecMap,
    title: 'logstash-*',
    timeFieldName: '@timestamp',
  },
});
