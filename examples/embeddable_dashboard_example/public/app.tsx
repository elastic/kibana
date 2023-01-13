/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EmbeddableDashboardsExampleStartDeps } from './plugin';
import { BasicReduxExample } from './basic_redux_example';

export const renderApp = async (
  { data, dashboard }: EmbeddableDashboardsExampleStartDeps,
  { element }: AppMountParameters
) => {
  const dataViews = await data.dataViews.find('kibana_sample_data_logs');
  const findDashboardsService = await dashboard.findDashboardsService();

  const logsSampleDashboardId = (await findDashboardsService?.findByTitle('[Logs] Web Traffic'))
    ?.id;

  const examples =
    dataViews.length > 0 ? (
      <>
        <BasicReduxExample dashboardId={logsSampleDashboardId} />
      </>
    ) : (
      <div>{'Install web logs sample data to run the embeddable dashboard examples.'}</div>
    );

  ReactDOM.render(
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Embeddable Dashboards" />
      <KibanaPageTemplate.Section>{examples}</KibanaPageTemplate.Section>
    </KibanaPageTemplate>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
