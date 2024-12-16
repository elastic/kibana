/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { monaco } from '@kbn/monaco';
import { ESQLControlsFlyout } from './control_flyout';
import { untilPluginStartServicesReady } from './kibana_services';
import type { ESQLControlState } from './types';

import './flyout.scss';

interface Context {
  queryString: string;
  core: CoreStart;
  search: ISearchGeneric;
  controlType: EsqlControlType;
  dashboardApi: DashboardApi;
  controlId?: string;
  panelId?: string;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

export async function isActionCompatible(queryString: string) {
  // we want to make sure that the current query is an ES|QL query
  return isOfAggregateQueryType({ esql: queryString });
}

export async function executeAction({
  queryString,
  core,
  search,
  controlType,
  dashboardApi,
  controlId,
  panelId,
  cursorPosition,
  initialState,
}: Context) {
  const isCompatibleAction = await isActionCompatible(queryString);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }

  const deps = await untilPluginStartServicesReady();
  const handle = core.overlays.openFlyout(
    toMountPoint(
      React.cloneElement(
        <KibanaRenderContextProvider {...core}>
          <KibanaContextProvider
            services={{
              ...deps,
            }}
          >
            <ESQLControlsFlyout
              queryString={queryString}
              search={search}
              controlType={controlType}
              closeFlyout={() => {
                handle.close();
              }}
              dashboardApi={dashboardApi}
              panelId={panelId}
              controlId={controlId}
              cursorPosition={cursorPosition}
              initialState={initialState}
            />
          </KibanaContextProvider>
        </KibanaRenderContextProvider>,
        {
          closeFlyout: () => {
            handle.close();
          },
        }
      ),
      core
    ),
    {
      size: 's',
      'data-test-subj': 'create_esql_control_flyout',
      className: 'esqlControls__overlay',
      isResizable: true,
      type: 'push',
      paddingSize: 'm',
      hideCloseButton: true,
      onClose: (overlayRef) => {
        overlayRef.close();
      },
      outsideClickCloses: true,
    }
  );
}
