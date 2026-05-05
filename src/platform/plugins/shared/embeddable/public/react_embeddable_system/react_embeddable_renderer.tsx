/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';

import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import useAsync from 'react-use/lib/useAsync';
import { PanelLoader } from '@kbn/panel-loader';
import { useEuiTheme } from '@elastic/eui';
import type { PresentationPanelProps } from './panel_component/types';
import type { DefaultEmbeddableApi } from './types';
import { untilPluginStartServicesReady } from '../kibana_services';
import { getReactEmbeddableFactory } from './react_embeddable_registry';

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
  panelProps?: Omit<PresentationPanelProps<Api>, 'Component' | 'componentApi'>;
  hidePanelChrome?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const { loading, value, error } = useAsync(async () => {
    const startTime = performance.now();

    const [, factory, { buildEmbeddable, PhaseTracker, PresentationPanel }] = await Promise.all([
      untilPluginStartServicesReady(),
      getReactEmbeddableFactory<SerializedState, Api>(type),
      import('../async_module'),
    ]);

    const phaseTracker = new PhaseTracker(startTime);

    const { Component, componentApi } = await buildEmbeddable<SerializedState, Api>({
      factory,
      maybeId,
      parentApi: getParentApi(),
      phaseTracker,
      type,
    });

    phaseTracker.trackPhaseEvents(componentApi);
    onApiAvailable?.(componentApi);

    return {
      Component,
      componentApi,
      Panel: PresentationPanel,
      phaseTracker,
    };
    // Ancestry chain is expected to use 'key' attribute to reset DOM and state
    // when unwrappedComponent needs to be re-loaded
  }, [type]);

  useEffect(() => {
    return () => {
      value?.phaseTracker.cleanup();
    };
  }, [value]);

  if (loading)
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

  if (error || !value) {
    return <div>{error?.message}</div>;
  }

  return (
    <value.Panel<Api, {}>
      Component={value.Component}
      componentApi={value.componentApi}
      hidePanelChrome={hidePanelChrome}
      {...panelProps}
    />
  );
};
