/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import { presentationUtilService } from '../../services/kibana_services';
import { printViewportVisStyles } from '../print_styles';
import { DASHBOARD_MARGIN_SIZE } from './constants';
import { getHighlightStyles } from './highlight_styles';

type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

export interface Props extends DivProps {
  appFixedViewport?: HTMLElement;
  id: string;
  index?: number;
  type: string;
  key: string;
  isRenderable?: boolean;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}

export const Item = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      appFixedViewport,
      id,
      index,
      type,
      isRenderable = true,
      setDragHandles,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const dashboardApi = useDashboardApi();
    const dashboardInternalApi = useDashboardInternalApi();
    const [
      highlightPanelId,
      scrollToPanelId,
      expandedPanelId,
      focusedPanelId,
      useMargins,
      viewMode,
      dashboardContainerRef,
      arePanelsRelated,
    ] = useBatchedPublishingSubjects(
      dashboardApi.highlightPanelId$,
      dashboardApi.scrollToPanelId$,
      dashboardApi.expandedPanelId$,
      dashboardApi.focusedPanelId$,
      dashboardApi.settings.useMargins$,
      dashboardApi.viewMode$,
      dashboardInternalApi.dashboardContainerRef$,
      dashboardInternalApi.arePanelsRelated$
    );

    const expandPanel = expandedPanelId !== undefined && expandedPanelId === id;
    const hidePanel = expandedPanelId !== undefined && expandedPanelId !== id;
    const focusPanel = focusedPanelId !== undefined && focusedPanelId === id;
    const blurPanel =
      focusedPanelId !== undefined &&
      focusedPanelId !== id &&
      !arePanelsRelated(id, focusedPanelId);
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

    const dashboardContainerTopOffset = dashboardContainerRef?.offsetTop || 0;
    const globalNavTopOffset = appFixedViewport?.offsetTop || 0;
    const styles = useMemoCss(dashboardGridItemStyles);

    const renderedEmbeddable = useMemo(() => {
      const panelProps = {
        showBadges: true,
        showBorder: useMargins,
        showNotifications: true,
        showShadow: false,
        setDragHandles,
      };

      return (
        <EmbeddableRenderer
          type={type}
          maybeId={id}
          getParentApi={() => dashboardApi}
          key={`${type}_${id}`}
          panelProps={panelProps}
          onApiAvailable={(api) => dashboardApi.registerChildApi(api)}
        />
      );
    }, [id, dashboardApi, type, useMargins, setDragHandles]);

    const { euiTheme } = useEuiTheme();
    const hoverActionsHeight = euiTheme.base * 2;

    const focusStyles = blurPanel
      ? styles.focusPanelBlur
      : css({
          scrollMarginTop: `${
            dashboardContainerTopOffset +
            globalNavTopOffset +
            DASHBOARD_MARGIN_SIZE +
            hoverActionsHeight
          }px`,
        });

    return (
      <div
        css={[focusStyles, styles.item]}
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
            <EuiLoadingChart size="l" />
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

export const DashboardGridItem = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const dashboardApi = useDashboardApi();
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);

  const deferBelowFoldEnabled = useMemo(
    () => presentationUtilService.labsService.isProjectEnabled('labs:dashboard:deferBelowFold'),
    []
  );

  const isEnabled = viewMode !== 'print' && deferBelowFoldEnabled;

  return isEnabled ? <ObservedItem ref={ref} {...props} /> : <Item ref={ref} {...props} />;
});

const dashboardGridItemStyles = {
  item: (context: UseEuiTheme) =>
    css([
      {
        height: '100%',
        // Remove padding in fullscreen mode
        '.kbnAppWrapper--hiddenChrome &.dshDashboardGrid__item--expanded': {
          padding: 0,
        },
        '.kbnAppWrapper--hiddenChrome & .dshDashboardGrid__item--expanded': {
          padding: 0,
        },
      },
      getHighlightStyles(context),
      printViewportVisStyles(context),
    ]),
  focusPanelBlur: css({
    pointerEvents: 'none',
    opacity: '0.25',
  }),
};
