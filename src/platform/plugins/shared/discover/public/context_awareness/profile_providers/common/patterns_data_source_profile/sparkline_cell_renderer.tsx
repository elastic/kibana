/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { SparklineChart } from './sparkline_chart';

interface Props {
  services: ProfileProviderServices;
  values: number[];
  isDetails: boolean;
  defaultRowHeight?: number;
}

export const SparklineCellRenderer: FC<Props> = ({
  services,
  values,
  isDetails,
  defaultRowHeight,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerStyle = useMemo(
    () => getContainerStyle(euiTheme, defaultRowHeight),
    [euiTheme, defaultRowHeight]
  );

  return (
    <div css={containerStyle}>
      <SparklineChart services={services} values={values} rowHeight={defaultRowHeight ?? 1} />
    </div>
  );
};

export function getSparklineCellRenderer(
  services: ProfileProviderServices,
  values: unknown,
  isDetails: boolean,
  defaultRowHeight?: number
) {
  if (values === undefined) {
    return '-';
  }
  return (
    <SparklineCellRenderer
      services={services}
      values={values as number[]}
      isDetails={isDetails}
      defaultRowHeight={defaultRowHeight}
    />
  );
}

function getContainerStyle(euiTheme: UseEuiTheme['euiTheme'], defaultRowHeight?: number) {
  // the keywords are slightly larger than the default text height,
  // so they need to be adjusted to fit within the row height while
  // not truncating the bottom of the text
  let rowHeight = 2;
  if (defaultRowHeight === undefined) {
    rowHeight = 2;
  } else if (defaultRowHeight < 2) {
    rowHeight = 1;
  } else {
    rowHeight = Math.floor(defaultRowHeight / 1.5);
  }

  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: rowHeight,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transform: `translateY(calc(${euiTheme.size.m} / 4))`, // we apply this transform so that the component appears vertically centered
  };
}
