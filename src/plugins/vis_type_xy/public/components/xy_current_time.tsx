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
import { CurrentTime } from '../../../charts/public';

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
