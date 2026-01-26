/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { EuiErrorBoundary, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import { css } from '@emotion/react';
import { PanelLoader } from '@kbn/panel-loader';
import type { PublishesTitle } from '@kbn/presentation-publishing';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';

import { PresentationPanelHeader } from './panel_header/presentation_panel_header';
import type { PresentationPanelHoverActionsProps } from './panel_header/presentation_panel_hover_actions';
import { PresentationPanelHoverActionsWrapper } from './panel_header/presentation_panel_hover_actions_wrapper';
import { PresentationPanelErrorInternal } from './presentation_panel_error_internal';
import type { DefaultPresentationPanelApi, PresentationPanelInternalProps } from './types';

const PresentationPanelChrome = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  ComponentPropsType extends {} = {}
>({
  children,

  index,
  hideHeader,
  showShadow,
  showBorder,
  showBadges,
  showNotifications,
  getActions,
  actionPredicate,
  titleHighlight,

  setDragHandle,

  api,
}: React.PropsWithChildren<
  Omit<
    PresentationPanelInternalProps<ApiType, ComponentPropsType>,
    'hidePanelChrome' | 'setDragHandles' | 'Component' | 'componentProps'
  > & {
    setDragHandle: PresentationPanelHoverActionsProps['setDragHandle'];
    api: ApiType | null;
  }
>) => {
  const headerId = useMemo(() => htmlIdGenerator()(), []);

  const viewModeSubject = useMemo(() => {
    if (apiPublishesViewMode(api)) return api.viewMode$;
    if (apiHasParentApi(api) && apiPublishesViewMode(api.parentApi)) return api.parentApi.viewMode$;
  }, [api]);

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
    api?.dataLoading$,
    api?.blockingError$,
    api?.title$,
    api?.hideTitle$,
    api?.description$,
    api?.defaultTitle$,
    api?.defaultDescription$,
    viewModeSubject,
    (api?.parentApi as Partial<PublishesTitle>)?.hideTitle$
  );
  const viewMode = rawViewMode ?? 'view';

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
    <PresentationPanelHoverActionsWrapper
      {...{
        index,
        api,
        getActions,
        actionPredicate,
        viewMode,
        showNotifications,
        showBorder,
      }}
      setDragHandle={setDragHandle}
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
        css={styles.embPanel}
      >
        {!hideHeader && api && (
          <PresentationPanelHeader
            api={api}
            setDragHandle={setDragHandle}
            headerId={headerId}
            viewMode={viewMode}
            hideTitle={hideTitle}
            showBadges={showBadges}
            getActions={getActions}
            showNotifications={showNotifications}
            panelTitle={panelTitle ?? defaultPanelTitle}
            panelDescription={panelDescription ?? defaultPanelDescription}
            titleHighlight={titleHighlight}
          />
        )}
        {children}
      </EuiPanel>
    </PresentationPanelHoverActionsWrapper>
  );
};

export const PresentationPanelInternal = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  ComponentPropsType extends {} = {}
>({
  Component,
  componentProps,

  setDragHandles,
  hidePanelChrome,
  ...rest
}: PresentationPanelInternalProps<ApiType, ComponentPropsType>) => {
  const [api, setApi] = useState<ApiType | null>(null);
  const [dataLoading, blockingError] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading$,
    api?.blockingError$
  );

  const dragHandles = useRef<{ [dragHandleKey: string]: HTMLElement | null }>({});

  const setDragHandle = useCallback(
    (id: string, ref: HTMLElement | null) => {
      dragHandles.current[id] = ref;
      setDragHandles?.(Object.values(dragHandles.current));
    },
    [setDragHandles]
  );

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading$))) {
    setInitialLoadComplete(true);
  }

  const InnerPanel = useMemo(() => {
    return (
      <>
        {blockingError && api && <PresentationPanelErrorInternal api={api} error={blockingError} />}
        {!initialLoadComplete && <PanelLoader />}
        <div
          className={blockingError ? 'embPanel__content--hidden' : 'embPanel__content'}
          css={styles.embPanelContent}
        >
          <EuiErrorBoundary>
            <Component
              {...(componentProps as React.ComponentProps<typeof Component>)}
              ref={(newApi) => {
                if (newApi && !api) setApi(newApi);
              }}
            />
          </EuiErrorBoundary>
        </div>
      </>
    );
  }, [blockingError, api, initialLoadComplete, Component, componentProps]);

  return hidePanelChrome ? (
    InnerPanel
  ) : (
    <PresentationPanelChrome {...rest} api={api} setDragHandle={setDragHandle}>
      {InnerPanel}
    </PresentationPanelChrome>
  );
};

/**
 * if there is no reliance on EUI theme, then it is more performant to store styles as minimizable objects
 * outside of the React component so that it is not parsed on every render
 */
const styles = {
  embPanel: css({
    zIndex: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  }),
  embPanelContent: css({
    '&.embPanel__content': {
      display: 'flex',
      flex: '1 1 100%',
      zIndex: 1,
      minHeight: 0, // Absolute must for Firefox to scroll contents
      overflow: 'hidden',
      height: '100%',
    },
    '&.embPanel__content--hidden, &[data-error]': {
      display: 'none',
    },
  }),
};
