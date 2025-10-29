/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowSchemaForAutocomplete } from './schema';

describe('WorkflowSchemaForAutocomplete', () => {
  it('autocomplete schema should be very forgiving', () => {
    // should allow empty '"with" block
    expect(() =>
      WorkflowSchemaForAutocomplete.parse({
        name: 'test',
        steps: [
          {
            name: 'step1',
            type: 'console',
            with: {},
          },
        ],
      })
    ).not.toThrow();
  });
});
