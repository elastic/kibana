/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSortPos } from './helper';

test('returns correct position on complete modifier matches', () => {
  expect(getSortPos('from a | ').pos).toBe('none');
  expect(getSortPos('from a | s').pos).toBe('pre-start');
  expect(getSortPos('from a | so').pos).toBe('pre-start');
  expect(getSortPos('from a | sor').pos).toBe('pre-start');
  expect(getSortPos('from a | sort').pos).toBe('start');
  expect(getSortPos('from a | sort ').pos).toBe('space1');
  expect(getSortPos('from a | sort col').pos).toBe('column');
  expect(getSortPos('from a | sort col ').pos).toBe('space2');
  expect(getSortPos('from a | sort col ASC').pos).toBe('order');
  expect(getSortPos('from a | sort col DESC ').pos).toBe('space3');
  expect(getSortPos('from a | sort col DESC NULLS FIRST').pos).toBe('nulls');
  expect(getSortPos('from a | sort col DESC NULLS LAST ').pos).toBe('space4');
  expect(getSortPos('from a | sort col DESC NULLS LAST, ').pos).toBe('space1');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2').pos).toBe('column');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2 DESC').pos).toBe('order');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2 NULLS LAST').pos).toBe('nulls');
  expect(getSortPos('from a | sort col DESC NULLS LAST, col2 NULLS LAST ').pos).toBe('space4');
});
