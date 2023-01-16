/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import { EuiCode, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

export const StaticByReferenceExample = ({ dashboardId }: { dashboardId?: string }) => {
  return dashboardId ? (
    <>
      <EuiTitle>
        <h2>Static dashboard from library example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Loads a static, non-editable version of the <EuiCode>[Logs] Web Traffic</EuiCode>{' '}
          dashboard.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel
        hasBorder={true}
        // Once https://github.com/elastic/kibana/pull/145628 is merged, we should (hopefully) be able to make the dashboard
        // conform to the height of the panel by uncommenting this:
        // css={css`
        //   height: 300px;
        // `}
      >
        <DashboardContainerRenderer
          savedObjectId={dashboardId}
          getCreationOptions={() => {
            return {}; // no special creation options - just loading a saved object
          }}
          onDashboardContainerLoaded={(container) => {
            return; // this example is static, so don't need to do anything with the dashboard container
          }}
        />
      </EuiPanel>
    </>
  ) : (
    <div>Ensure that the web logs sample dashboard is loaded to view this example.</div>
  );
};
