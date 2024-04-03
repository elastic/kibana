/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getRowsPerPageOptions } from './rows_per_page';

const SORTED_OPTIONS = [10, 25, 50, 100, 250, 500];

describe('rows per page', () => {
  describe('getRowsPerPageOptions', () => {
    it('should return default options if not provided', () => {
      expect(getRowsPerPageOptions()).toEqual(SORTED_OPTIONS);
    });

    it('should return default options if current value is one of them', () => {
      expect(getRowsPerPageOptions(250)).toEqual(SORTED_OPTIONS);
    });

    it('should return extended options if current value is not one of them', () => {
      expect(getRowsPerPageOptions(350)).toEqual([10, 25, 50, 100, 250, 350, 500]);
    });
  });
});
