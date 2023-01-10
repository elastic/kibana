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
import { ControlsExampleStartDeps } from './plugin';
import { BasicReduxExample } from './basic_redux_example';
import { EditExample } from './edit_example';
import { SearchExample } from './search_example';

export const renderApp = async (
  { data, navigation }: ControlsExampleStartDeps,
  { element }: AppMountParameters
) => {
  const dataViews = await data.dataViews.find('kibana_sample_data_logs');
  const examples =
    dataViews.length > 0 ? (
      <>
        <SearchExample dataView={dataViews[0]} navigation={navigation} data={data} />
        <EuiSpacer size="xl" />
        <EditExample />
        <EuiSpacer size="xl" />
        <BasicReduxExample dataViewId={dataViews[0].id!} />
      </>
    ) : (
      <div>{'Install web logs sample data to run controls examples.'}</div>
    );

  ReactDOM.render(
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Controls as a Building Block" />
      <KibanaPageTemplate.Section>{examples}</KibanaPageTemplate.Section>
    </KibanaPageTemplate>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
