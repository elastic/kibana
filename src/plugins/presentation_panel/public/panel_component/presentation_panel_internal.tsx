/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiErrorBoundary, EuiFlexGroup, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import { PanelLoader } from '@kbn/panel-loader';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React, { useMemo, useRef, useState } from 'react';
import { PresentationPanelHeader } from './panel_header/presentation_panel_header';
import { PresentationPanelHoverActions } from './panel_header/presentation_panel_hover_actions';
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

  setDragHandles,
}: PresentationPanelInternalProps<ApiType, ComponentPropsType>) => {
  const [api, setApi] = useState<ApiType | null>(null);
  const headerId = useMemo(() => htmlIdGenerator()(), []);

  const hoverDragHandleRef = useRef<HTMLDivElement | null>(null);
  const headerDragHandleRef = useRef<HTMLDivElement | null>(null);

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
    defaultPanelDescription,
    rawViewMode,
    parentHidePanelTitle,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading,
    api?.blockingError,
    api?.panelTitle,
    api?.hidePanelTitle,
    api?.panelDescription,
    api?.defaultPanelTitle,
    api?.defaultPanelDescription,
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
    !Boolean(panelTitle ?? defaultPanelTitle);

  const contentAttrs = useMemo(() => {
    const attrs: { [key: string]: boolean } = {};
    if (dataLoading) {
      attrs['data-loading'] = true;
    } else {
      attrs['data-render-complete'] = true;
    }
    if (blockingError) attrs['data-error'] = true;
    return attrs;
  }, [dataLoading, blockingError]);

  return (
    <PresentationPanelHoverActions
      {...{
        index,
        api,
        getActions,
        actionPredicate,
        viewMode,
        showNotifications,
        showBorder,
        setDragHandle: (ref) => {
          hoverDragHandleRef.current = ref;
          setDragHandles?.([hoverDragHandleRef.current, headerDragHandleRef.current]);
        },
      }}
    >
      <EuiPanel
        role="figure"
        paddingSize="none"
        className={classNames('embPanel', {
          'embPanel--editing': viewMode === 'edit',
        })}
        hasShadow={showShadow}
        aria-labelledby={headerId}
        data-test-subj="embeddablePanel"
        {...contentAttrs}
      >
        {!hideHeader && api && (
          <PresentationPanelHeader
            api={api}
            setDragHandle={(ref) => {
              headerDragHandleRef.current = ref;
              setDragHandles?.([hoverDragHandleRef.current, headerDragHandleRef.current]);
            }}
            headerId={headerId}
            viewMode={viewMode}
            hideTitle={hideTitle}
            showBadges={showBadges}
            getActions={getActions}
            showNotifications={showNotifications}
            panelTitle={panelTitle ?? defaultPanelTitle}
            panelDescription={panelDescription ?? defaultPanelDescription}
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
              ref={(newApi) => {
                if (newApi && !api) setApi(newApi);
              }}
            />
          </EuiErrorBoundary>
        </div>
      </EuiPanel>
    </PresentationPanelHoverActions>
  );
};
