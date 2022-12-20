/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiAccordion, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

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
        <EuiAccordion
          id="searchExample"
          buttonContent={
            <>
              <EuiTitle>
                <h2>Search example</h2>
              </EuiTitle>
              <EuiText>
                <p>
                  Pass filters, query, and time range to narrow controls. Combine search bar filters
                  with controls filters to narrow results.
                </p>
              </EuiText>
            </>
          }
        >
          <SearchExample dataView={dataViews[0]} navigation={navigation} data={data} />
        </EuiAccordion>

        <EuiSpacer size="xl" />

        <EuiAccordion
          id="editExample"
          buttonContent={
            <>
              <EuiTitle>
                <h2>Edit and save example</h2>
              </EuiTitle>
              <EuiText>
                <p>Customize controls and persist state to local storage.</p>
              </EuiText>
            </>
          }
        >
          <EditExample />
        </EuiAccordion>

        <EuiSpacer size="xl" />

        <EuiAccordion
          id="reduxExample"
          buttonContent={
            <>
              <EuiTitle>
                <h2>Redux example</h2>
              </EuiTitle>
              <EuiText>
                <p>Use the redux context from the control group to set layout style.</p>
              </EuiText>
            </>
          }
        >
          <BasicReduxExample dataViewId={dataViews[0].id!} />
        </EuiAccordion>
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
