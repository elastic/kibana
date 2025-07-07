/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { attachTriggerCommand, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('KEEP', () => {
    it('suggests available fields after KEEP', async () => {
      const { assertSuggestions } = await setup();

      assertSuggestions('FROM a | KEEP /', [
        '`any#Char$Field`',
        'booleanField',
        'cartesianPointField',
        'cartesianShapeField',
        'counterDoubleField',
        'counterIntegerField',
        'counterLongField',
        'dateField',
        'dateNanosField',
        'doubleField',
        'functionNamedParametersField',
        'geoPointField',
        'geoShapeField',
        'integerField',
        'ipField',
        'keywordField',
        'kubernetes.something.something',
        'longField',
        'textField',
        'unsignedLongField',
        'versionField',
      ]);
    });

    it('prioritizes the extensions registry suggestions', async () => {
      const { assertSuggestionsOrder } = await setup();

      assertSuggestionsOrder('FROM logs* | KEEP /', 'kubernetes.something.something', '1C');
    });

    it('suggests command and pipe after a field has been used in KEEP', async () => {
      const { assertSuggestions } = await setup();

      assertSuggestions('FROM logs* | KEEP doubleField /', [attachTriggerCommand('| '), ',']);
    });
  });
});
