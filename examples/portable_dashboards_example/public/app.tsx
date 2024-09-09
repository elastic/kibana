/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ReactDOM from 'react-dom';
import React, { useMemo } from 'react';
import { useAsync } from 'react-use/lib';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { AppMountParameters } from '@kbn/core/public';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { DashboardListingTable } from '@kbn/dashboard-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { DualReduxExample } from './dual_redux_example';
import { StartDeps } from './plugin';
import { StaticByValueExample } from './static_by_value_example';
import { StaticByReferenceExample } from './static_by_reference_example';
import { DynamicByReferenceExample } from './dynamically_add_panels_example';
import { DashboardWithControlsExample } from './dashboard_with_controls_example';

const DASHBOARD_DEMO_PATH = '/dashboardDemo';
const DASHBOARD_LIST_PATH = '/listingDemo';

export const renderApp = async (
  { data, dashboard }: StartDeps,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <PortableDashboardsDemos data={data} history={history} dashboard={dashboard} />,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};

const PortableDashboardsDemos = ({
  data,
  dashboard,
  history,
}: {
  data: StartDeps['data'];
  dashboard: StartDeps['dashboard'];
  history: AppMountParameters['history'];
}) => {
  return (
    <Router history={history}>
      <Routes>
        <Route exact path="/">
          <Redirect to={DASHBOARD_DEMO_PATH} />
        </Route>
        <Route path={DASHBOARD_LIST_PATH}>
          <PortableDashboardListingDemo history={history} />
        </Route>
        <Route path={DASHBOARD_DEMO_PATH}>
          <DashboardsDemo data={data} dashboard={dashboard} history={history} />
        </Route>
      </Routes>
    </Router>
  );
};

const DashboardsDemo = ({
  data,
  history,
  dashboard,
}: {
  history: AppMountParameters['history'];
  data: StartDeps['data'];
  dashboard: StartDeps['dashboard'];
}) => {
  const { loading, value: dataviewResults } = useAsync(async () => {
    const dataViews = await data.dataViews.find('kibana_sample_data_logs');
    const findDashboardsService = await dashboard.findDashboardsService();
    const logsSampleDashboardId = (await findDashboardsService?.findByTitle('[Logs] Web Traffic'))
      ?.id;
    return { dataViews, logsSampleDashboardId };
  }, []);

  const usageDemos = useMemo(() => {
    if (loading || !dataviewResults) return null;
    if (dataviewResults?.dataViews.length === 0) {
      <div>{'Install web logs sample data to run the embeddable dashboard examples.'}</div>;
    }
    const { dataViews, logsSampleDashboardId } = dataviewResults;
    return (
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
    );
  }, [dataviewResults, loading]);

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Portable dashboards usage" />
      <KibanaPageTemplate.Section>
        <EuiButton onClick={() => history.push(DASHBOARD_LIST_PATH)}>
          View portable dashboard listing page
        </EuiButton>
        <EuiSpacer size="xl" />
        {usageDemos}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

const PortableDashboardListingDemo = ({ history }: { history: AppMountParameters['history'] }) => {
  return (
    <DashboardListingTable
      goToDashboard={(dashboardId) =>
        alert(`Here's where I would redirect you to ${dashboardId ?? 'a new Dashboard'}`)
      }
      getDashboardUrl={() => 'https://www.elastic.co/'}
    >
      <EuiButton onClick={() => history.push(DASHBOARD_DEMO_PATH)}>
        Go back to usage demos
      </EuiButton>
      <EuiSpacer size="xl" />
      <EuiCallOut title="You can render something cool here" iconType="search" />
      <EuiSpacer size="xl" />
    </DashboardListingTable>
  );
};
