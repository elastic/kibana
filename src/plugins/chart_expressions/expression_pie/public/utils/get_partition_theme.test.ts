/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getPartitionTheme } from './get_partition_theme';
import { createMockPieParams } from '../mocks';

const visParams = createMockPieParams();

describe('getConfig', () => {
  it('should cap the outerSizeRatio to 1', () => {
    expect(
      getPartitionTheme(visParams, {}, { width: 400, height: 400 }).partition?.outerSizeRatio
    ).toBe(1);
  });

  it('should not have outerSizeRatio for split chart', () => {
    expect(
      getPartitionTheme(
        {
          ...visParams,
          dimensions: {
            ...visParams.dimensions,
            splitColumn: [
              {
                type: 'vis_dimension',
                accessor: 1,
                format: {
                  id: 'number',
                  params: {},
                },
              },
            ],
          },
        },
        {},
        { width: 400, height: 400 }
      ).partition?.outerSizeRatio
    ).toBeUndefined();

    expect(
      getPartitionTheme(
        {
          ...visParams,
          dimensions: {
            ...visParams.dimensions,
            splitRow: [
              {
                type: 'vis_dimension',
                accessor: 1,
                format: {
                  id: 'number',
                  params: {},
                },
              },
            ],
          },
        },
        {},
        { width: 400, height: 400 }
      ).partition?.outerSizeRatio
    ).toBeUndefined();
  });

  it('should not set outerSizeRatio if dimensions are not defined', () => {
    expect(getPartitionTheme(visParams, {}).partition?.outerSizeRatio).toBeUndefined();
  });
});
