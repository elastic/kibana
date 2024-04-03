/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiErrorBoundary, EuiFlexGroup, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import { PanelLoader } from '@kbn/panel-loader';
import {
  apiPublishesPhaseEvents,
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';
import { PresentationPanelHeader } from './panel_header/presentation_panel_header';
import { PresentationPanelError } from './presentation_panel_error';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from './types';

export const PresentationPanelInternal = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  ComponentPropsType extends {} = {}
>({
  index,
  hideHeader,
  showShadow,
  showBorder,

  showBadges,
  showNotifications,
  getActions,
  actionPredicate,

  Component,
  componentProps,

  onPanelStatusChange,
}: PresentationPanelInternalProps<ApiType, ComponentPropsType>) => {
  const [api, setApi] = useState<ApiType | null>(null);
  const headerId = useMemo(() => htmlIdGenerator()(), []);

  const viewModeSubject = (() => {
    if (apiPublishesViewMode(api)) return api.viewMode;
    if (apiHasParentApi(api) && apiPublishesViewMode(api.parentApi)) return api.parentApi.viewMode;
  })();

  const [
    dataLoading,
    blockingError,
    panelTitle,
    hidePanelTitle,
    panelDescription,
    defaultPanelTitle,
    rawViewMode,
    parentHidePanelTitle,
  ] = useBatchedPublishingSubjects(
    api?.dataLoading,
    api?.blockingError,
    api?.panelTitle,
    api?.hidePanelTitle,
    api?.panelDescription,
    api?.defaultPanelTitle,
    viewModeSubject,
    api?.parentApi?.hidePanelTitle
  );
  const viewMode = rawViewMode ?? 'view';

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading))) {
    setInitialLoadComplete(true);
  }

  const hideTitle =
    Boolean(hidePanelTitle) ||
    Boolean(parentHidePanelTitle) ||
    (viewMode === 'view' && !Boolean(panelTitle ?? defaultPanelTitle));

  useEffect(() => {
    let subscription: Subscription;
    if (api && onPanelStatusChange && apiPublishesPhaseEvents(api)) {
      subscription = api.onPhaseChange.subscribe((phase) => {
        if (phase) onPanelStatusChange(phase);
      });
    }
    return () => subscription?.unsubscribe();
  }, [api, onPanelStatusChange]);

  const contentAttrs = useMemo(() => {
    const attrs: { [key: string]: boolean } = {};
    if (dataLoading) attrs['data-loading'] = true;
    if (blockingError) attrs['data-error'] = true;
    return attrs;
  }, [dataLoading, blockingError]);

  return (
    <EuiPanel
      role="figure"
      paddingSize="none"
      className={classNames('embPanel', {
        'embPanel--editing': viewMode === 'edit',
      })}
      hasShadow={showShadow}
      hasBorder={showBorder}
      aria-labelledby={headerId}
      data-test-embeddable-id={api?.uuid}
      data-test-subj="embeddablePanel"
    >
      {!hideHeader && api && (
        <PresentationPanelHeader
          api={api}
          index={index}
          headerId={headerId}
          viewMode={viewMode}
          hideTitle={hideTitle}
          showBadges={showBadges}
          getActions={getActions}
          actionPredicate={actionPredicate}
          panelDescription={panelDescription}
          showNotifications={showNotifications}
          panelTitle={panelTitle ?? defaultPanelTitle}
        />
      )}
      {blockingError && api && (
        <EuiFlexGroup
          alignItems="center"
          className="eui-fullHeight embPanel__error"
          data-test-subj="embeddableError"
          justifyContent="center"
        >
          <PresentationPanelError api={api} error={blockingError} />
        </EuiFlexGroup>
      )}
      {!initialLoadComplete && <PanelLoader />}
      <div className={blockingError ? 'embPanel__content--hidden' : 'embPanel__content'}>
        <EuiErrorBoundary>
          <Component
            {...(componentProps as React.ComponentProps<typeof Component>)}
            {...contentAttrs}
            ref={(newApi) => {
              if (newApi && !api) setApi(newApi);
            }}
          />
        </EuiErrorBoundary>
      </div>
    </EuiPanel>
  );
};
