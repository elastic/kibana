/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverGridContextMock } from '../__mocks__/grid_context';
import { discoverServiceMock } from '../__mocks__/services';
import { formatValueAsPlainText } from './format_value_as_plain_text';

describe('formatValueAsPlainText', () => {
  it('should convert a value to text', () => {
    const result = formatValueAsPlainText({
      rows: discoverGridContextMock.rows,
      rowsFlattened: discoverGridContextMock.rowsFlattened,
      dataView: discoverGridContextMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'date',
      rowIndex: 0,
    });

    expect(result).toBe('2020-20-01T12:12:12.123');

    // TODO: add more tests
  });
});
