/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import {
  type ESQLControlVariable,
  type ESQLVariableType,
  type ControlTriggerSource,
} from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { monaco } from '@kbn/monaco';
import type { ESQLEditorTelemetryService } from '@kbn/esql-editor';
import { untilPluginStartServicesReady } from '../../kibana_services';
import { ESQLControlsFlyout } from './control_flyout';

interface Context {
  queryString: string;
  core: CoreStart;
  search: ISearchGeneric;
  timefilter: TimefilterContract;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (
    controlState: OptionsListESQLControlState,
    updatedQuery: string
  ) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: OptionsListESQLControlState;
  closeFlyout?: () => void;
  ariaLabelledBy: string;
  currentApp?: string;
  triggerSource?: ControlTriggerSource;
  telemetryService: ESQLEditorTelemetryService;
}

export async function loadESQLControlFlyout({
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
  closeFlyout = () => {},
  ariaLabelledBy,
  currentApp,
  triggerSource,
  telemetryService,
}: Context) {
  const timeRange = timefilter.getTime();
  const deps = await untilPluginStartServicesReady();

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider
        services={{
          ...deps,
        }}
      >
        <ESQLControlsFlyout
          ariaLabelledBy={ariaLabelledBy}
          queryString={queryString}
          search={search}
          initialVariableType={variableType}
          closeFlyout={closeFlyout}
          onSaveControl={onSaveControl}
          onCancelControl={onCancelControl}
          cursorPosition={cursorPosition}
          initialState={initialState}
          esqlVariables={esqlVariables}
          timeRange={timeRange}
          currentApp={currentApp}
          telemetryTriggerSource={triggerSource}
          telemetryService={telemetryService}
        />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
}
