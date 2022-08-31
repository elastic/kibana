/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { disabledTypesWithTooltipText } from '../disabled_types_with_tooltip_text';

jest.mock('../../translations', () => ({
  BINARY_TYPE_NOT_SUPPORTED: 'Binary field is unsupported at the moment',
}));
describe('disabledTypesWithTooltipText', () => {
  it('should return Binary field is unsupported at the moment for binary type', () => {
    const type = 'binary';
    expect(disabledTypesWithTooltipText[type]).toEqual('Binary field is unsupported at the moment');
  });
});
