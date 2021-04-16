/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PanelData } from '../../../../../../common/types';

interface DomainBounds {
  domainStart: number;
  domainEnd: number;
}

export const calculateDomainForSeries = (series: PanelData[]): DomainBounds => {
  const seriesData = series[0]?.data || [];

  return seriesData?.length
    ? {
        domainStart: seriesData[0][0],
        domainEnd: seriesData[Math.max(seriesData.length - 1, 0)][0],
      }
    : ({} as DomainBounds);
};
