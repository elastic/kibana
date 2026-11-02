/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DrilldownFactory as DrilldownFactoryUi } from '../../components/drilldown_factory';
import { useDrilldownsManager } from '../context';
import type { DrilldownFactory } from '../../types';

interface Props {
  factory: DrilldownFactory;
  constant?: boolean;
}

export const DrilldownFactoryView: React.FC<Props> = ({ factory, constant }) => {
  const drilldowns = useDrilldownsManager();
  const handleChange = React.useMemo(() => {
    if (constant) return undefined;
    return () => drilldowns.setDrilldownFactory(undefined);
  }, [drilldowns, constant]);

  return (
    <DrilldownFactoryUi name={factory.displayName} icon={factory.euiIcon} onChange={handleChange} />
  );
};
