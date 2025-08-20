/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP } from '.';

describe('Sessions management - APP', () => {
  describe.each([
    { backgroundSearchEnabled: true, expectedName: 'Background Search' },
    { backgroundSearchEnabled: false, expectedName: 'Search Sessions' },
  ])(
    'when background search is $backgroundSearchEnabled',
    ({ backgroundSearchEnabled, expectedName }) => {
      it('should return the id', () => {
        expect(APP.id).toBe('search_sessions');
      });

      describe('when background search is disabled', () => {
        it('should return the correct i18n name', () => {
          expect(APP.getI18nName(backgroundSearchEnabled)).toBe(expectedName);
        });
      });
    }
  );
});
