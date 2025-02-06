/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface VisSeries {
  yaxis?: number;
  label: string;
  lines?: {
    show?: boolean;
    lineWidth?: number;
    fill?: number;
    steps?: number;
  };
  points?: {
    show?: boolean;
    symbol?: 'cross' | 'x' | 'circle' | 'square' | 'diamond' | 'plus' | 'triangle';
    fillColor?: string;
    fill?: number;
    radius?: number;
    lineWidth?: number;
  };
  bars: {
    lineWidth?: number;
    fill?: number;
  };
  color?: string;
  data: Array<Array<number | null>>;
  stack: boolean;
  _hide?: boolean;
}
