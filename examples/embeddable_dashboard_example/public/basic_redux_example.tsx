/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';

import {
  LazyDashboardContainerRenderer,
  DashboardCreationOptions,
  DashboardContainer,
} from '@kbn/dashboard-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

const DashboardContainerRenderer = withSuspense(LazyDashboardContainerRenderer);

export const BasicReduxExample = ({ dataViewId }: { dataViewId: string }) => {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  const getCreationOptions = useCallback((): DashboardCreationOptions => {
    return {};
  }, []);

  return (
    <>
      <EuiTitle>
        <h2>Redux example</h2>
      </EuiTitle>
      <EuiText>
        <p>Use the redux context from the control group to set layout style.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <DashboardContainerRenderer
          savedObjectId={'test-id'}
          getCreationOptions={getCreationOptions}
          onDashboardContainerLoaded={(container) => setDashboardContainer(container)}
        />
      </EuiPanel>
    </>
  );
};
