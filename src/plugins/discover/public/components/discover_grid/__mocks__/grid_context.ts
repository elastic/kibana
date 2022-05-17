/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flattenHit } from '@kbn/data-plugin/common';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { esHits } from '../../../__mocks__/es_hits';
import { GridContext } from '../discover_grid_context';

export const discoverGridContextMock: GridContext = {
  expanded: undefined,
  setExpanded: jest.fn(),
  rows: esHits,
  rowsFlattened: esHits.map((hit) => flattenHit(hit, indexPatternMock)),
  onFilter: jest.fn(),
  indexPattern: indexPatternMock,
  isDarkMode: false,
  selectedDocs: [],
  setSelectedDocs: jest.fn(),
  getCellTextToCopy: (rowIndex, columnId) => 'mocked',
};
