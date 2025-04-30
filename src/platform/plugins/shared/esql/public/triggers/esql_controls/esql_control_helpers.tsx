/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { lazy, Suspense, Fragment } from 'react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLVariableType, ESQLControlVariable, ESQLControlState } from '@kbn/esql-types';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { monaco } from '@kbn/monaco';
import { untilPluginStartServicesReady } from '../../kibana_services';

interface Context {
  queryString: string;
  core: CoreStart;
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

export async function isActionCompatible(queryString: string) {
  return Boolean(queryString && queryString.trim().length > 0);
}

const Fallback = () => <Fragment />;

export async function executeAction({
  queryString,
  core,
  search,
  variableType,
  esqlVariables,
  onSaveControl,
  onCancelControl,
  cursorPosition,
  initialState,
}: Context) {
  const isCompatibleAction = await isActionCompatible(queryString);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }
  const LazyControlFlyout = lazy(async () => {
    const { ESQLControlsFlyout } = await import('./control_flyout');
    return {
      default: ESQLControlsFlyout,
    };
  });

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
            <Suspense fallback={<Fallback />}>
              <LazyControlFlyout
                queryString={queryString}
                search={search}
                initialVariableType={variableType}
                closeFlyout={() => {
                  handle.close();
                }}
                onSaveControl={onSaveControl}
                onCancelControl={onCancelControl}
                cursorPosition={cursorPosition}
                initialState={initialState}
                esqlVariables={esqlVariables}
              />
            </Suspense>
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
      isResizable: true,
      type: 'push',
      paddingSize: 'm',
      hideCloseButton: true,
      onClose: (overlayRef) => {
        overlayRef.close();
      },
      outsideClickCloses: true,
      maxWidth: 800,
    }
  );
}
