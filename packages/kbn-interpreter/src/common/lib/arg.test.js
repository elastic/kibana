/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Arg } from './arg';

describe('Arg', () => {
  it('sets required to false by default', () => {
    const isOptional = new Arg({
      name: 'optional_me',
    });
    expect(isOptional.required).toBe(false);

    const isRequired = new Arg({
      name: 'require_me',
      required: true,
    });
    expect(isRequired.required).toBe(true);
  });
});
