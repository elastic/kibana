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
import { ControlsExampleStartDeps } from './plugin';
import { BasicReduxExample } from './basic_redux_example';

const ControlsExamples = ({ dataViewId }: { dataViewId?: string }) => {
  const examples = dataViewId ? (
    <>
      <BasicReduxExample dataViewId={dataViewId} />
    </>
  ) : (
    <div>{'Please install e-commerce sample data to run controls examples.'}</div>
  );
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Controls as a Building Block" />
      <KibanaPageTemplate.Section>{examples}</KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

export const renderApp = async (
  { data }: ControlsExampleStartDeps,
  { element }: AppMountParameters
) => {
  const dataViews = await data.dataViews.find('kibana_sample_data_ecommerce');
  const dataViewId = dataViews.length > 0 ? dataViews[0].id : undefined;
  ReactDOM.render(<ControlsExamples dataViewId={dataViewId} />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
