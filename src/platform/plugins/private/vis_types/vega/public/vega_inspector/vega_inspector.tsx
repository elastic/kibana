/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { InspectorViewDescription } from '@kbn/inspector-plugin/public';
import type { VegaDataInspectorProps } from './vega_data_inspector';
import type { VegaInspectorViewDependencies } from './types';

const VegaDataInspector = lazy(() => import('./vega_data_inspector'));

const vegaDebugLabel = i18n.translate('visTypeVega.inspector.vegaDebugLabel', {
  defaultMessage: 'Vega debug',
});

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
