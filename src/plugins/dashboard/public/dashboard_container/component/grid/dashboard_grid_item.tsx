/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingChart } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddablePanel, ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DashboardPanelState } from '../../../../common';
import { pluginServices } from '../../../services/plugin_services';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';

type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

export interface Props extends DivProps {
  id: DashboardPanelState['explicitInput']['id'];
  index?: number;
  type: DashboardPanelState['type'];
  expandedPanelId?: string;
  focusedPanelId?: string;
  key: string;
  isRenderable?: boolean;
}

export const Item = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      expandedPanelId,
      focusedPanelId,
      id,
      index,
      type,
      isRenderable = true,
      // The props below are passed from ReactGridLayoutn and need to be merged with their counterparts.
      // https://github.com/react-grid-layout/react-grid-layout/issues/1241#issuecomment-658306889
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const dashboardApi = useDashboardApi();
    const [highlightPanelId, scrollToPanelId, useMargins, viewMode] = useBatchedPublishingSubjects(
      dashboardApi.highlightPanelId$,
      dashboardApi.scrollToPanelId$,
      dashboardApi.useMargins$,
      dashboardApi.viewMode
    );

    const expandPanel = expandedPanelId !== undefined && expandedPanelId === id;
    const hidePanel = expandedPanelId !== undefined && expandedPanelId !== id;
    const focusPanel = focusedPanelId !== undefined && focusedPanelId === id;
    const blurPanel = focusedPanelId !== undefined && focusedPanelId !== id;
    const classes = classNames({
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

    const focusStyles = blurPanel
      ? css`
          pointer-events: none;
          opacity: 0.25;
        `
      : undefined;

    const renderedEmbeddable = useMemo(() => {
      const {
        embeddable: { reactEmbeddableRegistryHasKey },
      } = pluginServices.getServices();

      const panelProps = {
        showBadges: true,
        showBorder: useMargins,
        showNotifications: true,
        showShadow: false,
      };

      // render React embeddable
      if (reactEmbeddableRegistryHasKey(type)) {
        return (
          <ReactEmbeddableRenderer
            type={type}
            maybeId={id}
            getParentApi={() => dashboardApi}
            key={`${type}_${id}`}
            panelProps={panelProps}
            onApiAvailable={(api) => dashboardApi.registerChildApi(api)}
          />
        );
      }
      // render legacy embeddable
      return (
        <EmbeddablePanel
          key={type}
          index={index}
          embeddable={() => dashboardApi.untilEmbeddableLoaded(id)}
          {...panelProps}
        />
      );
    }, [id, dashboardApi, type, index, useMargins]);

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
  const {
    settings: { isProjectEnabledInLabs },
  } = pluginServices.getServices();
  const dashboardApi = useDashboardApi();
  const [focusedPanelId, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.focusedPanelId$,
    dashboardApi.viewMode
  );

  const isEnabled =
    viewMode !== 'print' &&
    isProjectEnabledInLabs('labs:dashboard:deferBelowFold') &&
    (!focusedPanelId || focusedPanelId === props.id);

  return isEnabled ? <ObservedItem ref={ref} {...props} /> : <Item ref={ref} {...props} />;
});
