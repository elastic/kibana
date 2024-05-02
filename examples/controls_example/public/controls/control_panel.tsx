/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormControlLayout, EuiFormRow, htmlIdGenerator } from '@elastic/eui';
// import { ControlError } from '@kbn/controls-plugin/public/control_group/component/control_error_component';
import { i18n } from '@kbn/i18n';
import { isPromise } from '@kbn/std';

import {
  PresentationPanelInternalProps,
  PresentationPanelProps,
} from '@kbn/presentation-panel-plugin/public/panel_component/types';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
import { FloatingActions } from '@kbn/presentation-util-plugin/public';
import React, { useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { DefaultControlApi } from './types';

export const ControlPanel = <State extends object>({
  index,

  getActions,
  actionPredicate,

  Component,
  // componentProps,

  onPanelStatusChange,
}: PresentationPanelProps<DefaultControlApi<State>, {}>) => {
  const [api, setApi] = useState<DefaultControlApi<State> | null>(null);
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
    // controlGroupSettings,
    rawViewMode,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading,
    api?.blockingError,
    api?.panelTitle,
    api?.defaultPanelTitle,
    viewModeSubject
  );
  const viewMode: ViewMode = rawViewMode ?? 'view';

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading))) {
    setInitialLoadComplete(true);
  }

  const ControlComponent = value?.component;

  return blockingError || loading || !ControlComponent ? (
    <EuiFormControlLayout>
      <>{error}</>
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
    <FloatingActions
      // className={classNames({
      //   'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
      //   'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      // })}
      viewMode={viewMode}
      // embeddable={embeddable}
      disabledActions={[]}
      isEnabled={true}
    >
      <EuiFormRow data-test-subj="control-frame-title" fullWidth label={'here'}>
        <EuiFormControlLayout
          fullWidth
          prepend={
            <>
              {/* {(embeddable && customPrepend) ?? null}
              {renderEmbeddablePrepend()} */}
              prepend
            </>
          }
        >
          <ControlComponent />
        </EuiFormControlLayout>
      </EuiFormRow>
    </FloatingActions>
  );
};
