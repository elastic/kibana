/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { useDrilldownManager } from '../context';

export const DrilldownManagerFooter: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const drilldowns = useDrilldownManager();
  React.useEffect(() => {
    drilldowns.setFooter(children);
    return () => {
      drilldowns.setFooter(null);
    };
  });
  return null;
};

export const RenderDrilldownManagerFooter: React.FC = () => {
  const drilldowns = useDrilldownManager();
  const footer = drilldowns.useFooter();
  return <>{footer}</>;
};
