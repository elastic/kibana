/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './_presentation_panel.scss';

import { EuiErrorBoundary, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { PanelLoader } from '@kbn/panel-loader';
import { isPromise } from '@kbn/std';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { css } from '@emotion/react';
import { untilPluginStartServicesReady } from '../kibana_services';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from './types';
import { getErrorLoadingPanel } from './presentation_panel_strings';

export const PresentationPanel = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  PropsType extends {} = {}
>(
  props: PresentationPanelProps<ApiType, PropsType> & {
    hidePanelChrome?: boolean;
  }
) => {
  const { Component, hidePanelChrome, ...passThroughProps } = props;
  const { euiTheme } = useEuiTheme();
  const { loading, value } = useAsync(async () => {
    if (hidePanelChrome) {
      return {
        unwrappedComponent: isPromise(Component) ? await Component : Component,
      };
    }

    const startServicesPromise = untilPluginStartServicesReady();
    const componentPromise = isPromise(Component) ? Component : Promise.resolve(Component);
    const results = await Promise.allSettled([
      startServicesPromise,
      componentPromise,
      import('./panel_module'),
    ]);

    let loadErrorReason: string | undefined;
    for (const result of results) {
      if (result.status === 'rejected') {
        loadErrorReason = result.reason;
        break;
      }
    }

    return {
      loadErrorReason,
      Panel:
        results[2].status === 'fulfilled' ? results[2].value?.PresentationPanelInternal : undefined,
      PanelError:
        results[2].status === 'fulfilled'
          ? results[2].value?.PresentationPanelErrorInternal
          : undefined,
      unwrappedComponent: results[1].status === 'fulfilled' ? results[1].value : undefined,
    };

    // Ancestry chain is expected to use 'key' attribute to reset DOM and state
    // when unwrappedComponent needs to be re-loaded
  }, []);

  if (loading)
    return props.hideLoader ? null : (
      <PanelLoader
        showShadow={props.showShadow}
        showBorder={props.showBorder}
        css={css`
          border-radius: ${euiTheme.border.radius.medium};
        `}
        dataTestSubj="embed
        dablePanelLoadingIndicator"
      />
    );

  const Panel = value?.Panel;
  const PanelError = value?.PanelError;
  const UnwrappedComponent = value?.unwrappedComponent;
  const shouldHavePanel = !hidePanelChrome;
  if (value?.loadErrorReason || (shouldHavePanel && !Panel) || !UnwrappedComponent) {
    return (
      <EuiFlexGroup
        alignItems="center"
        className="eui-fullHeight embPanel__error"
        data-test-subj="embeddableError"
        justifyContent="center"
      >
        {PanelError ? (
          <PanelError error={new Error(value?.loadErrorReason ?? getErrorLoadingPanel())} />
        ) : (
          value?.loadErrorReason ?? getErrorLoadingPanel()
        )}
      </EuiFlexGroup>
    );
  }

  return shouldHavePanel && Panel ? (
    <Panel<ApiType, PropsType> Component={UnwrappedComponent} {...passThroughProps} />
  ) : (
    <EuiErrorBoundary>
      <UnwrappedComponent
        {...((passThroughProps.componentProps ?? {}) as React.ComponentProps<
          typeof UnwrappedComponent
        >)}
      />
    </EuiErrorBoundary>
  );
};
