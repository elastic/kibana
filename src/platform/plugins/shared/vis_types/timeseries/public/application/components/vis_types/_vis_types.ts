/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

export const visStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 100%;
  position: relative;

  .tvbVisTimeSeries {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .tvbVisTimeSeriesDark {
    .echReactiveChart_unavailable {
      color: #dfe5ef;
    }
    .echLegendItem {
      color: #dfe5ef;
    }
  }

  .tvbVisTimeSeriesLight {
    .echReactiveChart_unavailable {
      color: #343741;
    }
    .echLegendItem {
      color: #343741;
    }
  }
`;
