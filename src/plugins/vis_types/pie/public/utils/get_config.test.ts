/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getConfig } from './get_config';
import { createMockPieParams } from '../mocks';

const visParams = createMockPieParams();

describe('getConfig', () => {
  it('should cap the outerSizeRatio to 1', () => {
    expect(getConfig(visParams, {}, { width: 400, height: 400 }).outerSizeRatio).toBe(1);
  });

  it('should not have outerSizeRatio for split chart', () => {
    expect(
      getConfig(
        {
          ...visParams,
          dimensions: {
            ...visParams.dimensions,
            splitColumn: [
              {
                accessor: 1,
                format: {
                  id: 'number',
                },
              },
            ],
          },
        },
        {},
        { width: 400, height: 400 }
      ).outerSizeRatio
    ).toBeUndefined();

    expect(
      getConfig(
        {
          ...visParams,
          dimensions: {
            ...visParams.dimensions,
            splitRow: [
              {
                accessor: 1,
                format: {
                  id: 'number',
                },
              },
            ],
          },
        },
        {},
        { width: 400, height: 400 }
      ).outerSizeRatio
    ).toBeUndefined();
  });

  it('should not set outerSizeRatio if dimensions are not defined', () => {
    expect(getConfig(visParams, {}).outerSizeRatio).toBeUndefined();
  });
});
