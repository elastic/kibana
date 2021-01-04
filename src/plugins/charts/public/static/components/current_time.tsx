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
import moment, { Moment } from 'moment';
import React, { FC } from 'react';

import { LineAnnotation, AnnotationDomainTypes, LineAnnotationStyle } from '@elastic/charts';
import lightEuiTheme from '@elastic/eui/dist/eui_theme_light.json';
import darkEuiTheme from '@elastic/eui/dist/eui_theme_dark.json';

interface CurrentTimeProps {
  isDarkMode: boolean;
  domainEnd?: number | Moment;
}

/**
 * Render current time line annotation on @elastic/charts `Chart`
 */
export const CurrentTime: FC<CurrentTimeProps> = ({ isDarkMode, domainEnd }) => {
  const lineAnnotationStyle: Partial<LineAnnotationStyle> = {
    line: {
      strokeWidth: 2,
      stroke: isDarkMode ? darkEuiTheme.euiColorDanger : lightEuiTheme.euiColorDanger,
      opacity: 0.7,
    },
  };

  // Domain end of 'now' will be milliseconds behind current time, so we extend time by 1 minute and check if
  // the annotation is within this range; if so, the line annotation uses the domainEnd as its value
  const now = moment();
  const isAnnotationAtEdge = domainEnd
    ? moment(domainEnd).add(1, 'm').isAfter(now) && now.isAfter(domainEnd)
    : false;
  const lineAnnotationData = [
    {
      dataValue: isAnnotationAtEdge ? domainEnd : now.valueOf(),
    },
  ];

  return (
    <LineAnnotation
      id="__current-time__"
      hideTooltips
      domainType={AnnotationDomainTypes.XDomain}
      dataValues={lineAnnotationData}
      style={lineAnnotationStyle}
    />
  );
};
