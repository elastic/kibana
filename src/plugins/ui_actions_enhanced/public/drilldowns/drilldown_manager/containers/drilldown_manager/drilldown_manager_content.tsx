/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { CreateDrilldownForm } from '../create_drilldown_form';
import { Tabs } from '../tabs';
import { useDrilldownManager } from '../context';
import { EditDrilldownForm } from '../edit_drilldown_form';

export const DrilldownManagerContent: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const route = drilldowns.useRoute();

  if (route[0] === 'new' && !!route[1]) return <CreateDrilldownForm />;
  if (route[0] === 'manage' && !!route[1]) return <EditDrilldownForm eventId={route[1]} />;

  return <Tabs />;
};
