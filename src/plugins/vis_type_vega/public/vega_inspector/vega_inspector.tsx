/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from 'kibana/public';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { Adapters, RequestAdapter, InspectorViewDescription } from '../../../inspector/public';
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
