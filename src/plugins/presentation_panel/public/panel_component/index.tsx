/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './_presentation_panel.scss';

import { PanelLoader } from '@kbn/panel-loader';
import { isPromise } from '@kbn/std';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { untilPluginStartServicesReady } from '../kibana_services';

import { DefaultPresentationPanelApi, PresentationPanelProps } from './types';

export const PresentationPanel = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  PropsType extends {} = {}
>(
  props: PresentationPanelProps<ApiType, PropsType>
) => {
  const { Component, ...passThroughProps } = props;
  const { loading, value } = useAsync(async () => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = await import('./presentation_panel');
    const componentPromise = isPromise(Component) ? Component : Promise.resolve(Component);
    const [, unwrappedComponent, panelModule] = await Promise.all([
      startServicesPromise,
      componentPromise,
      modulePromise,
    ]);
    const Panel = panelModule.PresentationPanelInternal;
    return { Panel, unwrappedComponent };
  }, []);

  if (loading || !value?.Panel || !value?.unwrappedComponent)
    return (
      <PanelLoader showShadow={props.showShadow} dataTestSubj="embeddablePanelLoadingIndicator" />
    );

  return (
    <value.Panel<ApiType, PropsType> Component={value.unwrappedComponent} {...passThroughProps} />
  );
};
