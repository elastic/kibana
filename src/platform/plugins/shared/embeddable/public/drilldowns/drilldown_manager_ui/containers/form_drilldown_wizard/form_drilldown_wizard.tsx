/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DrilldownFactoryPicker } from '../drilldown_factory_picker';
import { useDrilldownsManager } from '../context';
import { CreateDrilldownForm } from './create_drilldown_form';

export const FormDrilldownWizard: React.FC = ({}) => {
  const drilldowns = useDrilldownsManager();
  const drilldown = drilldowns.getDrilldownManager();

  return (
    <>
      <DrilldownFactoryPicker />
      {drilldown && <CreateDrilldownForm drilldown={drilldown} />}
    </>
  );
};
