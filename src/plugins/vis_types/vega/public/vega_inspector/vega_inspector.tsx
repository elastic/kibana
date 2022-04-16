/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Adapters, RequestAdapter, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import { VegaAdapter } from './vega_adapter';
import type { VegaDataInspectorProps } from './vega_data_inspector';

const VegaDataInspector = lazy(() => import('./vega_data_inspector'));

export interface VegaInspectorAdapters extends Adapters {
  requests: RequestAdapter;
  vega: VegaAdapter;
}

const vegaDebugLabel = i18n.translate('visTypeVega.inspector.vegaDebugLabel', {
  defaultMessage: 'Vega debug',
});

interface VegaInspectorViewDependencies {
  uiSettings: IUiSettingsClient;
}

export const getVegaInspectorView = (dependencies: VegaInspectorViewDependencies) =>
  ({
    title: vegaDebugLabel,
    shouldShow(adapters) {
      return Boolean(adapters.vega);
    },
    component: (props) => (
      <KibanaContextProvider services={dependencies}>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <VegaDataInspector {...(props as VegaDataInspectorProps)} />
        </Suspense>
      </KibanaContextProvider>
    ),
  } as InspectorViewDescription);

export const createInspectorAdapters = (): VegaInspectorAdapters => ({
  requests: new RequestAdapter(),
  vega: new VegaAdapter(),
});
