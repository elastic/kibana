/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormControlLayout, EuiFormLabel, htmlIdGenerator } from '@elastic/eui';
// import { ControlError } from '@kbn/controls-plugin/public/control_group/component/control_error_component';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { PresentationPanelProps } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { FloatingActions } from '@kbn/presentation-util-plugin/public';
import { isPromise } from '@kbn/std';
import React, { useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { DefaultControlApi } from './types';

export const ControlPanel = <
  State extends object,
  ApiType extends DefaultControlApi = DefaultControlApi
>({
  index,

  getActions,
  actionPredicate,

  Component,
  // componentProps,

  onPanelStatusChange,
}: PresentationPanelProps<ApiType, {}>) => {
  const [api, setApi] = useState<ApiType | null>(null);
  const headerId = useMemo(() => htmlIdGenerator()(), []);

  const { loading, value, error } = useAsync(async () => {
    const componentPromise = isPromise(Component) ? Component : Promise.resolve(Component);
    const [unwrappedComponent] = await Promise.all([componentPromise]);
    return { component: unwrappedComponent };

    // Ancestry chain is expected to use 'key' attribute to reset DOM and state
    // when unwrappedComponent needs to be re-loaded
  }, []);

  const viewModeSubject = (() => {
    if (
      apiHasParentApi(api) && // api.parentApi => controGroupApi
      apiHasParentApi(api.parentApi) && // controlGroupApi.parentApi => dashboardApi
      apiPublishesViewMode(api.parentApi.parentApi)
    )
      return api.parentApi.parentApi.viewMode; // get view mode from dashboard API
  })();

  const [
    dataLoading,
    blockingError,
    panelTitle,
    defaultPanelTitle,
    grow,
    width,
    // controlGroupSettings,
    rawViewMode,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading,
    api?.blockingError,
    api?.panelTitle,
    api?.defaultPanelTitle,
    api?.grow,
    api?.width,
    viewModeSubject
  );

  const viewMode = (rawViewMode ?? ViewMode.VIEW) as ViewMode;

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading))) {
    setInitialLoadComplete(true);
  }

  const ControlComponent = value?.component;

  return (
    <FloatingActions
      // className={classNames({
      //   'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
      //   'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      // })}
      viewMode={viewMode}
      embeddable={api}
      disabledActions={[]}
      isEnabled={true}
    >
      {blockingError || !ControlComponent ? (
        <EuiFormControlLayout>
          <>{error ?? 'here'}</>
          {/* <ControlError
        error={
          blockingError ??
          new Error(
            i18n.translate('controlPanel.error.errorWhenLoadingControl', {
              defaultMessage: 'An error occurred while loading this control.',
            })
          )
        }
      /> */}
        </EuiFormControlLayout>
      ) : (
        <EuiFormControlLayout
          fullWidth
          isLoading={loading || Boolean(dataLoading)}
          prepend={
            api?.getCustomPrepend ? (
              <>{api.getCustomPrepend()}</>
            ) : (
              <EuiFormLabel>{panelTitle || defaultPanelTitle}</EuiFormLabel>
            )
          }
        >
          <ControlComponent
            ref={(newApi) => {
              if (newApi && !api) setApi(newApi);
            }}
          />
        </EuiFormControlLayout>
      )}
    </FloatingActions>
  );
};
