/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import { POC_TOAST_DEFAULT_CARD_HEIGHT } from './poc_toast_motion';

export interface PocToastCardMetricsUpdate {
  height?: number;
  width?: number;
}

export interface PocToastStackLayoutContextValue {
  isStackHovered: boolean;
  frontCardHeight: number;
  collapsedStackWidth: number | undefined;
  expandedStackWidth: number | undefined;
  cardHeights: Readonly<Record<string, number>>;
  queueCardMetrics: (toastId: string, update: PocToastCardMetricsUpdate) => void;
}

export const PocToastStackLayoutContext = createContext<PocToastStackLayoutContextValue>({
  isStackHovered: false,
  frontCardHeight: POC_TOAST_DEFAULT_CARD_HEIGHT,
  collapsedStackWidth: undefined,
  expandedStackWidth: undefined,
  cardHeights: {},
  queueCardMetrics: () => {},
});

export const usePocToastStackLayout = (): PocToastStackLayoutContextValue =>
  useContext(PocToastStackLayoutContext);
