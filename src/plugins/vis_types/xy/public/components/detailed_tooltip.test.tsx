/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTooltipData } from './detailed_tooltip';
import {
  aspects,
  aspectsWithSplitColumn,
  aspectsWithSplitRow,
  header,
  value,
} from './detailed_tooltip.mock';

describe('getTooltipData', () => {
  it('returns an array with the header and data information', () => {
    const tooltipData = getTooltipData(aspects, header, value);
    expect(tooltipData).toStrictEqual([
      {
        label: 'timestamp per 3 hours',
        value: '1611817200000',
      },
      {
        label: 'Count',
        value: '52',
      },
    ]);
  });

  it('returns an array with the data information if the header is not applied', () => {
    const tooltipData = getTooltipData(aspects, null, value);
    expect(tooltipData).toStrictEqual([
      {
        label: 'Count',
        value: '52',
      },
    ]);
  });

  it('returns an array with the split column information if it is provided', () => {
    const tooltipData = getTooltipData(aspectsWithSplitColumn, null, value);
    expect(tooltipData).toStrictEqual([
      {
        label: 'Cancelled: Descending',
        value: 'false',
      },
    ]);
  });

  it('returns an array with the split row information if it is provided', () => {
    const tooltipData = getTooltipData(aspectsWithSplitRow, null, value);
    expect(tooltipData).toStrictEqual([
      {
        label: 'Carrier: Descending',
        value: 'kibana',
      },
    ]);
  });
});
