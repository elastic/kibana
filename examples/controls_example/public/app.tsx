/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import {
  EuiText,
  EuiCard,
  EuiFieldSearch,
  EuiPage,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageBody,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { AppMountParameters, IUiSettingsClient } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { LazyControlGroupRenderer, ControlGroupContainer } from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { ControlsExampleStartDeps } from './plugin';

interface Props {
  dataView: DataView;
}
const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

function ControlsExamples({ dataView }: Props) {
  const [myControlGroup, setControlGroup] = useState<ControlGroupContainer>();

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header pageTitle="Controls Building Block" />
      <KibanaPageTemplate.Section>
        <EuiText>
          <p>The following showcases how to use the control group as a building block.</p>
        </EuiText>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section>
        <EuiText>
          This is a control group
          <ControlGroupRenderer
            onEmbeddableLoad={(controlGroup) => {
              setControlGroup(controlGroup);
              controlGroup.addDataControlFromField({
                dataViewId: dataView.id ?? 'kibana_sample_data_ecommerce',
                fieldName: 'customer_first_name.keyword',
              });
            }}
          />{' '}
        </EuiText>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
}

export const renderApp = async (
  { data }: ControlsExampleStartDeps,
  { element }: AppMountParameters
) => {
  const dataView = await data.dataViews.getDefault();
  if (dataView) ReactDOM.render(<ControlsExamples dataView={dataView} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
