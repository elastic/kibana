/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { expectSuggestions } from '../../../__tests__/commands/autocomplete';
import { autocomplete } from './autocomplete';

describe('LET Autocomplete', () => {
  it.each([
    ['LET selected ', ['= ']],
    ['let\tselected\n', ['= ']],
    ['LET selected = ', ['(FROM $0);', '(ROW $0);', '(TS $0);']],
    ['LET selected =', ['(FROM $0);', '(ROW $0);', '(TS $0);']],
    ['LET selected = (FROM index)', [';\n']],
  ])('suggests the next part of the binding after "%s"', async (query, expected) => {
    await expectSuggestions(query, expected, mockContext, 'let', undefined, autocomplete);
  });

  it('does not suggest a semicolon when one already follows the cursor', async () => {
    const query = 'LET selected = (FROM index) ;';

    await expectSuggestions(
      query,
      [],
      mockContext,
      'let',
      undefined,
      autocomplete,
      query.length - 2
    );
  });
});
