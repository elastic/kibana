/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useDrilldownManager } from '../context';
import { FlyoutFrame } from '../../components/flyout_frame';
import { DrilldownManagerContent } from './drilldown_manager_content';
import { RenderDrilldownManagerTitle } from '../drilldown_manager_title';
import { RenderDrilldownManagerFooter } from '../drilldown_manager_footer';
import { HelloBar } from '../hello_bar';

export const DrilldownManager: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const route = drilldowns.useRoute();

  const handleBack =
    route.length < 2 ? undefined : () => drilldowns.setRoute(route.slice(0, route.length - 1));

  return (
    <FlyoutFrame
      title={<RenderDrilldownManagerTitle />}
      banner={<HelloBar />}
      footer={<RenderDrilldownManagerFooter />}
      onClose={drilldowns.close}
      onBack={handleBack}
    >
      <DrilldownManagerContent />
    </FlyoutFrame>
  );
};
