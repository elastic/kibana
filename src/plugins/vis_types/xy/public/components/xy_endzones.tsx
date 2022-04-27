/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { DomainRange } from '@elastic/charts';

import { Endzones } from '@kbn/charts-plugin/public';

interface XYEndzones {
  enabled: boolean;
  isDarkMode: boolean;
  isFullBin: boolean;
  hideTooltips?: boolean;
  domain?: DomainRange;
  adjustedDomain?: DomainRange;
}

export const XYEndzones: FC<XYEndzones> = ({
  enabled,
  isDarkMode,
  isFullBin,
  hideTooltips,
  domain,
  adjustedDomain,
}) => {
  if (
    enabled &&
    domain &&
    adjustedDomain &&
    'min' in domain &&
    'max' in domain &&
    domain.minInterval !== undefined &&
    'min' in adjustedDomain &&
    'max' in adjustedDomain
  ) {
    return (
      <Endzones
        isFullBin={isFullBin}
        isDarkMode={isDarkMode}
        domainStart={domain.min}
        domainEnd={domain.max}
        interval={domain.minInterval}
        domainMin={adjustedDomain.min}
        domainMax={adjustedDomain.max}
        hideTooltips={hideTooltips}
      />
    );
  }

  return null;
};
