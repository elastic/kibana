/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IIndexPattern } from '.';
import { stubFields } from './field.stub';

export const stubIndexPattern: IIndexPattern = {
  id: 'logstash-*',
  fields: stubFields,
  title: 'logstash-*',
  timeFieldName: '@timestamp',
  getTimeField: () => ({ name: '@timestamp', type: 'date' }),
};

export const stubIndexPatternWithFields: IIndexPattern = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
};
