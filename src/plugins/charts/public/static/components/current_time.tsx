/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { Moment } from 'moment';
import React, { FC } from 'react';

import { LineAnnotation, AnnotationDomainType, LineAnnotationStyle } from '@elastic/charts';
import { euiLightVars as lightEuiTheme, euiDarkVars as darkEuiTheme } from '@kbn/ui-theme';

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
      domainType={AnnotationDomainType.XDomain}
      dataValues={lineAnnotationData}
      style={lineAnnotationStyle}
    />
  );
};
