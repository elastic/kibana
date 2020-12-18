/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { FC } from 'react';

import { DomainRange } from '@elastic/charts';

import { Endzones } from '../../../charts/public';

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
