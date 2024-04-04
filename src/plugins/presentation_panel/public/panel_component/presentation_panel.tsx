/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './_presentation_panel.scss';

import { EuiFlexGroup } from '@elastic/eui';
import { PanelLoader } from '@kbn/panel-loader';
import { isPromise } from '@kbn/std';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { untilPluginStartServicesReady } from '../kibana_services';
import { PresentationPanelError } from './presentation_panel_error';
import { DefaultPresentationPanelApi, PresentationPanelProps } from './types';
import { getErrorLoadingPanel } from './presentation_panel_strings';

export const PresentationPanel = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  PropsType extends {} = {}
>(
  props: PresentationPanelProps<ApiType, PropsType>
) => {
  const { Component, ...passThroughProps } = props;
  const { loading, value, error } = useAsync(async () => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = await import('./presentation_panel_internal');
    const componentPromise = isPromise(Component) ? Component : Promise.resolve(Component);
    const [, unwrappedComponent, panelModule] = await Promise.all([
      startServicesPromise,
      componentPromise,
      modulePromise,
    ]);
    const Panel = panelModule.PresentationPanelInternal;
    return { Panel, unwrappedComponent };
    // Ancestry chain is expected to use 'key' attribute to reset DOM and state
    // when unwrappedComponent needs to be re-loaded
  }, []);

  if (error || (!loading && (!value?.Panel || !value?.unwrappedComponent))) {
    return (
      <EuiFlexGroup
        alignItems="center"
        className="eui-fullHeight embPanel__error"
        data-test-subj="embeddableError"
        justifyContent="center"
      >
        <PresentationPanelError error={error ?? new Error(getErrorLoadingPanel())} />
      </EuiFlexGroup>
    );
  }

  if (loading || !value?.Panel || !value?.unwrappedComponent)
    return (
      <PanelLoader
        showShadow={props.showShadow}
        showBorder={props.showBorder}
        dataTestSubj="embeddablePanelLoadingIndicator"
      />
    );

  return (
    <value.Panel<ApiType, PropsType> Component={value.unwrappedComponent} {...passThroughProps} />
  );
};
