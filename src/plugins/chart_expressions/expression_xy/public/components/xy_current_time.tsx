/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { DomainRange } from '@elastic/charts';
import { CurrentTime } from '@kbn/charts-plugin/public';

interface XYCurrentTime {
  enabled: boolean;
  isDarkMode: boolean;
  domain?: DomainRange;
}

export const XYCurrentTime: FC<XYCurrentTime> = ({ enabled, isDarkMode, domain }) => {
  if (!enabled) {
    return null;
  }

  const domainEnd = domain && 'max' in domain ? domain.max : undefined;
  return <CurrentTime isDarkMode={isDarkMode} domainEnd={domainEnd} />;
};
