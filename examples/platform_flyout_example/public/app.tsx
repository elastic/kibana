/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageHeader, EuiPageSection } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Demo } from './examples/demo';
import { StartDeps } from './plugin';

export const renderApp = (core: CoreStart, _deps: StartDeps, mountParams: AppMountParameters) => {
  core.chrome.docTitle.change('Flyout examples');

  ReactDOM.render(
    core.rendering.addContext(
      <>
        <EuiPageHeader
          paddingSize="m"
          pageTitle="Platform flyouts"
          description="This example app demonstrates how to use the Platform Flyouts API for flyout-to-flyout interactions, and for showing detail content side by side with main content."
        />
        <EuiPageSection paddingSize="m" alignment="top">
          <Demo overlays={core.overlays} />
        </EuiPageSection>
      </>
    ),
    mountParams.element
  );

  return () => ReactDOM.unmountComponentAtNode(mountParams.element);
};
