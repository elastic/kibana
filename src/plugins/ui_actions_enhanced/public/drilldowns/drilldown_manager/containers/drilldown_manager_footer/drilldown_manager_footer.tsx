/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useDrilldownManager } from '../context';

export const DrilldownManagerFooter: React.FC = ({ children }) => {
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
