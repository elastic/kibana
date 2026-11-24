/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { useEntityFlyoutServices, type FlyoutChartFrameData } from './services_context';

/**
 * Asks the host to wrap a chart in the dashboard panel primitive. Hosts that
 * don't provide one (Discover) keep the plain chart.
 */
export const FlyoutChartPanel = ({
  id,
  title,
  chart,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly chart?: FlyoutChartFrameData;
  readonly children: ReactNode;
}) => {
  const { renderChartFrame } = useEntityFlyoutServices();
  if (!renderChartFrame) {
    return <>{children}</>;
  }
  return <>{renderChartFrame({ id, title, chart, children })}</>;
};
