/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extractTimeFields } from './extract_time_fields';

describe('extractTimeFields', () => {
  it('should handle no date fields', () => {
    const fields = [
      { type: 'text', name: 'name' },
      { type: 'text', name: 'name' },
    ];

    expect(extractTimeFields(fields)).toEqual([
      { display: `The indices which match this index pattern don't contain any time fields.` },
    ]);
  });

  it('should add extra options', () => {
    const fields = [{ type: 'date', name: '@timestamp' }];

    expect(extractTimeFields(fields)).toEqual([
      { display: '@timestamp', fieldName: '@timestamp' },
      { isDisabled: true, display: '───', fieldName: '' },
      { display: `I don't want to use the time filter`, fieldName: undefined },
    ]);
  });
});
