/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DataPoint {
  category: number;
  fields?: Record<string, unknown>;
  identifier?: string | number;
  text?: string;
  x: number;
  y: number;
}

export interface EmbeddingViewProps {
  config?: {
    autoLabelEnabled?: boolean;
    downsampleMaxPoints?: number;
    mode?: 'density' | 'points';
    pointSize?: number | null;
  };
  data: {
    category: Uint8Array;
    x: Float32Array;
    y: Float32Array;
  };
  height?: number;
  onSelection?: (value: DataPoint[] | null) => void;
  onTooltip?: (value: DataPoint | null) => void;
  querySelection?: (
    x: number,
    y: number,
    unitDistance: number
  ) => Promise<DataPoint | null> | DataPoint | null;
  selection?: DataPoint[] | null;
}

export declare class EmbeddingView {
  constructor(target: HTMLElement, props: EmbeddingViewProps);
  update(props: Partial<EmbeddingViewProps>): void;
  destroy(): void;
}
