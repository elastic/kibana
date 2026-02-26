/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { useDrilldownsManager } from '../context';

export const DrilldownManagerTitle: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const drilldowns = useDrilldownsManager();
  React.useEffect(() => {
    drilldowns.setTitle(children);
    return () => {
      drilldowns.resetTitle();
    };
  });
  return null;
};

export const RenderDrilldownManagerTitle: React.FC = () => {
  const drilldowns = useDrilldownsManager();
  const title = drilldowns.useTitle();
  return <>{title}</>;
};
