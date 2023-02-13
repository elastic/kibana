/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { EuiSpacer } from '@elastic/eui';
import { AppMountParameters } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { DualReduxExample } from './dual_redux_example';
import { PortableDashboardsExampleStartDeps } from './plugin';
import { StaticByValueExample } from './static_by_value_example';
import { StaticByReferenceExample } from './static_by_reference_example';
import { DynamicByReferenceExample } from './dynamically_add_panels_example';
import { DashboardWithControlsExample } from './dashboard_with_controls_example';

export const renderApp = async (
  { data, dashboard }: PortableDashboardsExampleStartDeps,
  { element }: AppMountParameters
) => {
  const dataViews = await data.dataViews.find('kibana_sample_data_logs');
  const findDashboardsService = await dashboard.findDashboardsService();
  const logsSampleDashboardId = (await findDashboardsService?.findByTitle('[Logs] Web Traffic'))
    ?.id;

  const examples =
    dataViews.length > 0 ? (
      <>
        <DashboardWithControlsExample dataView={dataViews[0]} />
        <EuiSpacer size="xl" />
        <DynamicByReferenceExample />
        <EuiSpacer size="xl" />
        <DualReduxExample />
        <EuiSpacer size="xl" />
        <StaticByReferenceExample dashboardId={logsSampleDashboardId} dataView={dataViews[0]} />
        <EuiSpacer size="xl" />
        <StaticByValueExample />
      </>
    ) : (
      <div>{'Install web logs sample data to run the embeddable dashboard examples.'}</div>
    );

  ReactDOM.render(
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Portable Dashboards" />
      <KibanaPageTemplate.Section>{examples}</KibanaPageTemplate.Section>
    </KibanaPageTemplate>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
