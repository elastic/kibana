/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { EuiLoadingChart } from '@elastic/eui';
import { css } from '@emotion/react';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DASHBOARD_MARGIN_SIZE } from '../../../dashboard_constants';
import { useDashboardInternalApi } from '../../../dashboard_api/use_dashboard_internal_api';
import { DashboardPanelState } from '../../../../common';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { presentationUtilService } from '../../../services/kibana_services';

type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

export interface Props extends DivProps {
  appFixedViewport?: HTMLElement;
  dashboardContainer?: HTMLElement;
  id: DashboardPanelState['explicitInput']['id'];
  index?: number;
  type: DashboardPanelState['type'];
  expandedPanelId?: string;
  focusedPanelId?: string;
  key: string;
  isRenderable?: boolean;
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
}

export const Item = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      appFixedViewport,
      dashboardContainer,
      expandedPanelId,
      focusedPanelId,
      id,
      index,
      type,
      isRenderable = true,
      setDragHandles,
      // The props below are passed from ReactGridLayoutn and need to be merged with their counterparts.
      // https://github.com/react-grid-layout/react-grid-layout/issues/1241#issuecomment-658306889
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const dashboardApi = useDashboardApi();
    const dashboardInternalApi = useDashboardInternalApi();
    const [highlightPanelId, scrollToPanelId, useMargins, viewMode] = useBatchedPublishingSubjects(
      dashboardApi.highlightPanelId$,
      dashboardApi.scrollToPanelId$,
      dashboardApi.settings.useMargins$,
      dashboardApi.viewMode
    );

    const expandPanel = expandedPanelId !== undefined && expandedPanelId === id;
    const hidePanel = expandedPanelId !== undefined && expandedPanelId !== id;
    const focusPanel = focusedPanelId !== undefined && focusedPanelId === id;
    const blurPanel = focusedPanelId !== undefined && focusedPanelId !== id;
    const classes = classNames('dshDashboardGrid__item', {
      'dshDashboardGrid__item--expanded': expandPanel,
      'dshDashboardGrid__item--hidden': hidePanel,
      'dshDashboardGrid__item--focused': focusPanel,
      'dshDashboardGrid__item--blurred': blurPanel,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      printViewport__vis: viewMode === 'print',
    });

    useLayoutEffect(() => {
      if (typeof ref !== 'function' && ref?.current) {
        const panelRef = ref.current;
        if (scrollToPanelId === id) {
          dashboardApi.scrollToPanel(panelRef);
        }
        if (highlightPanelId === id) {
          dashboardApi.highlightPanel(panelRef);
        }

        panelRef.querySelectorAll('*').forEach((e) => {
          if (blurPanel) {
            // remove blurred panels and nested elements from tab order
            e.setAttribute('tabindex', '-1');
          } else {
            // restore tab order
            e.removeAttribute('tabindex');
          }
        });
      }
    }, [id, dashboardApi, scrollToPanelId, highlightPanelId, ref, blurPanel]);

    const dashboardContainerTopOffset = dashboardContainer?.offsetTop || 0;
    const globalNavTopOffset = appFixedViewport?.offsetTop || 0;

    const focusStyles = blurPanel
      ? css`
          pointer-events: none;
          opacity: 0.25;
        `
      : css`
          scroll-margin-top: ${dashboardContainerTopOffset +
          globalNavTopOffset +
          DASHBOARD_MARGIN_SIZE}px;
        `;

    const renderedEmbeddable = useMemo(() => {
      const panelProps = {
        showBadges: true,
        showBorder: useMargins,
        showNotifications: true,
        showShadow: false,
        setDragHandles,
      };

      return (
        <ReactEmbeddableRenderer
          type={type}
          maybeId={id}
          getParentApi={() => ({
            ...dashboardApi,
            reload$: dashboardInternalApi.panelsReload$,
          })}
          key={`${type}_${id}`}
          panelProps={panelProps}
          onApiAvailable={(api) => dashboardInternalApi.registerChildApi(api)}
        />
      );
    }, [id, dashboardApi, dashboardInternalApi, type, useMargins, setDragHandles]);

    return (
      <div
        css={focusStyles}
        className={[classes, className].join(' ')}
        data-test-subj="dashboardPanel"
        id={`panel-${id}`}
        ref={ref}
        {...rest}
      >
        {isRenderable ? (
          <>
            {renderedEmbeddable}
            {children}
          </>
        ) : (
          <div>
            <EuiLoadingChart size="l" mono />
          </div>
        )}
      </div>
    );
  }
);

export const ObservedItem = React.forwardRef<HTMLDivElement, Props>((props, panelRef) => {
  const [intersection, updateIntersection] = useState<IntersectionObserverEntry>();
  const [isRenderable, setIsRenderable] = useState(false);

  const observerRef = useRef(
    new window.IntersectionObserver(([value]) => updateIntersection(value), {
      root: (panelRef as React.RefObject<HTMLDivElement>).current,
    })
  );

  useEffect(() => {
    const { current: currentObserver } = observerRef;
    currentObserver.disconnect();
    const { current } = panelRef as React.RefObject<HTMLDivElement>;

    if (current) {
      currentObserver.observe(current);
    }

    return () => currentObserver.disconnect();
  }, [panelRef]);

  useEffect(() => {
    if (intersection?.isIntersecting && !isRenderable) {
      setIsRenderable(true);
    }
  }, [intersection, isRenderable]);

  return <Item ref={panelRef} isRenderable={isRenderable} {...props} />;
});

// ReactGridLayout passes ref to children. Functional component children require forwardRef to avoid react warning
// https://github.com/react-grid-layout/react-grid-layout#custom-child-components-and-draggable-handles
export const DashboardGridItem = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const dashboardApi = useDashboardApi();
  const [focusedPanelId, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.focusedPanelId$,
    dashboardApi.viewMode
  );

  const deferBelowFoldEnabled = useMemo(
    () => presentationUtilService.labsService.isProjectEnabled('labs:dashboard:deferBelowFold'),
    []
  );

  const isEnabled =
    viewMode !== 'print' &&
    deferBelowFoldEnabled &&
    (!focusedPanelId || focusedPanelId === props.id);

  return isEnabled ? <ObservedItem ref={ref} {...props} /> : <Item ref={ref} {...props} />;
});
