/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ActionFactoryPicker } from '../action_factory_picker';
import { useDrilldownManager } from '../context';
import { CreateDrilldownForm } from './create_drilldown_form';

export const FormDrilldownWizard: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const actionFactory = drilldowns.useActionFactory();

  const drilldownState = drilldowns.getDrilldownState();
  let content: React.ReactNode = null;

  if (!actionFactory) content = null;
  if (drilldownState) content = <CreateDrilldownForm state={drilldownState} />;

  return (
    <>
      <ActionFactoryPicker />
      {content}
    </>
  );
};
