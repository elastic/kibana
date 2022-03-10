/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from 'src/plugins/data_views/public';

/**
 * Returns forced **Partial** IndexPattern for use in tests
 */
export const getIndexPatternMock = (): Promise<DataView> => {
  return Promise.resolve({
    id: 'mockIndexPattern',
    title: 'mockIndexPattern',
    fields: [
      { name: 'keywordField', type: 'string', aggregatable: true },
      { name: 'textField', type: 'string', aggregatable: false },
      { name: 'numberField', type: 'number', aggregatable: true },
    ],
  } as DataView);
};
