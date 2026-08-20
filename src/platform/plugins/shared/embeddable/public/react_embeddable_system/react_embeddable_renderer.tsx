/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';

import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import { PanelLoader } from '@kbn/panel-loader';
import { useEuiTheme } from '@elastic/eui';
import type { PresentationPanelProps } from './panel_component/types';
import type { DefaultEmbeddableApi } from './types';
import { untilPluginStartServicesReady } from '../kibana_services';
import { getEmbeddableDefinition } from './react_embeddable_registry';
import type { PhaseTracker } from './phase_tracker';

/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 */
export const EmbeddableRenderer = <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
  ParentApi extends HasSerializedChildState<SerializedState> = HasSerializedChildState<SerializedState>
>({
  type,
  maybeId,
  getParentApi,
  panelProps,
  onApiAvailable,
  hidePanelChrome,
}: {
  type: string;
  maybeId?: string;
  getParentApi: () => ParentApi;
  onApiAvailable?: (api: Api) => void;
  panelProps?: Omit<
    PresentationPanelProps<Api>,
    'Component' | 'componentApi' | 'componentInternalApi'
  >;
  hidePanelChrome?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const [value, setValue] = useState<
    | {
        Component: React.FC;
        componentApi: Api;
        internalApi: PresentationPanelProps<Api>['componentInternalApi'];
        Panel: React.ComponentType<PresentationPanelProps<Api>>;
        phaseTracker: PhaseTracker;
      }
    | undefined
  >();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let canceled = false;
    if (value) {
      setValue(undefined);
    }
    if (error) {
      setError(undefined);
    }

    async function loadValue() {
      const startTime = performance.now();

      const [, factory, { buildEmbeddable, PhaseTracker, PresentationPanel }] = await Promise.all([
        untilPluginStartServicesReady(),
        getEmbeddableDefinition<SerializedState, Api>(type),
        import('../async_module'),
      ]);
      if (canceled) return;

      const phaseTracker = new PhaseTracker(startTime);

      const { Component, componentApi, internalApi } = await buildEmbeddable<SerializedState, Api>({
        factory,
        maybeId,
        parentApi: getParentApi(),
        phaseTracker,
        type,
      });
      if (canceled) return;

      phaseTracker.trackPhaseEvents(componentApi);
      onApiAvailable?.(componentApi);

      setValue({
        Component,
        componentApi,
        internalApi,
        Panel: PresentationPanel,
        phaseTracker,
      });
    }

    loadValue().catch((loadError) => {
      if (!canceled) {
        setError(loadError);
      }
    });

    return () => {
      canceled = true;
    };

    // Ancestry chain is expected to use 'key' attribute to reset DOM and state
    // when unwrappedComponent needs to be re-loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    return () => {
      value?.phaseTracker.cleanup();
    };
  }, [value]);

  if (!value) {
    if (error) {
      return <div>{error?.message}</div>;
    }

    return panelProps?.hideLoader ? null : (
      <PanelLoader
        showShadow={panelProps?.showShadow}
        showBorder={panelProps?.showBorder}
        css={css`
          border-radius: ${euiTheme.border.radius.medium};
        `}
        dataTestSubj="embeddablePanelLoadingIndicator"
      />
    );
  }

  return (
    <value.Panel
      Component={value.Component}
      componentApi={value.componentApi}
      componentInternalApi={value.internalApi}
      hidePanelChrome={hidePanelChrome}
      {...panelProps}
    />
  );
};
