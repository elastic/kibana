/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DrilldownFactoryPicker as DrilldownFactoryPickerUi } from '../../components/drilldown_factory_picker';
import { useDrilldownsManager } from '../context';
import { DrilldownFactoryView } from '../drilldown_factory_view';

export const DrilldownFactoryPicker: React.FC = ({}) => {
  const drilldowns = useDrilldownsManager();
  const factory = drilldowns.useDrilldownFactory();

  if (!!factory) {
    return <DrilldownFactoryView factory={factory} />;
  }

  return (
    <DrilldownFactoryPickerUi
      factories={drilldowns.deps.factories}
      onSelect={(next) => {
        drilldowns.setDrilldownFactory(next);
      }}
    />
  );
};
