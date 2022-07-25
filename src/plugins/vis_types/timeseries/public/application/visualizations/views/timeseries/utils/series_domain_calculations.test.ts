/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateDomainForSeries } from './series_domain_calculation';
import { PanelData } from '../../../../../../common/types';

describe('calculateDomainForSeries', () => {
  it('should return 0 for domainStart and 3 for domainEnd', () => {
    const series = [
      {
        data: [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
        ],
      },
    ] as PanelData[];
    const domainBounds = calculateDomainForSeries(series);

    expect(domainBounds?.domainStart).toBe(0);
    expect(domainBounds?.domainEnd).toBe(3);
  });

  it('should return undefined when series is empty', () => {
    const domainBounds = calculateDomainForSeries([]);

    expect(domainBounds).toBeUndefined();
  });
});
