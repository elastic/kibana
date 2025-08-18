/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP } from '.';

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  BACKGROUND_SEARCH_ENABLED: true,
}));

describe('Sessions management - APP', () => {
  it('should return the id', () => {
    expect(APP.id).toBe('search_sessions');
  });

  describe('when background search is enabled', () => {
    it('should return the correct i18n name', () => {
      expect(APP.getI18nName()).toBe('Background Search');
    });
  });
});
