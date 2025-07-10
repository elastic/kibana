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
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { ESQLVariableType, type ESQLControlVariable, type ESQLControlState } from '@kbn/esql-types';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { monaco } from '@kbn/monaco';
import { untilPluginStartServicesReady } from '../../kibana_services';

interface Context {
  queryString: string;
  core: CoreStart;
  search: ISearchGeneric;
  timefilter: TimefilterContract;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

function isESQLVariableType(value: string): value is ESQLVariableType {
  return Object.values(ESQLVariableType).includes(value as ESQLVariableType);
}

export async function isActionCompatible(core: CoreStart, variableType: ESQLVariableType) {
  return core.uiSettings.get(ENABLE_ESQL) && isESQLVariableType(variableType);
}

const Fallback = () => <Fragment />;

export async function executeAction({
  queryString,
  core,
  search,
  timefilter,
  variableType,
  esqlVariables,
  onSaveControl,
  onCancelControl,
  cursorPosition,
  initialState,
}: Context) {
  const isCompatibleAction = await isActionCompatible(core, variableType);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }
  const LazyControlFlyout = lazy(async () => {
    const { ESQLControlsFlyout } = await import('./control_flyout');
    return {
      default: ESQLControlsFlyout,
    };
  });

  const timeRange = timefilter.getTime();

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
                timeRange={timeRange}
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
