/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingChart } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddablePanel, ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DashboardPanelState } from '../../../../common';
import { pluginServices } from '../../../services/plugin_services';
import { useDashboardContainer } from '../../embeddable/dashboard_container';

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
    const container = useDashboardContainer();
    const scrollToPanelId = container.select((state) => state.componentState.scrollToPanelId);
    const highlightPanelId = container.select((state) => state.componentState.highlightPanelId);
    const useMargins = container.select((state) => state.explicitInput.useMargins);

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
      printViewport__vis: container.getInput().viewMode === ViewMode.PRINT,
    });

    useLayoutEffect(() => {
      if (typeof ref !== 'function' && ref?.current) {
        const panelRef = ref.current;
        if (scrollToPanelId === id) {
          container.scrollToPanel(panelRef);
        }
        if (highlightPanelId === id) {
          container.highlightPanel(panelRef);
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
    }, [id, container, scrollToPanelId, highlightPanelId, ref, blurPanel]);

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
            getParentApi={() => container}
            key={`${type}_${id}`}
            panelProps={panelProps}
            onApiAvailable={(api) => container.registerChildApi(api)}
          />
        );
      }
      // render legacy embeddable
      return (
        <EmbeddablePanel
          key={type}
          index={index}
          embeddable={() => container.untilEmbeddableLoaded(id)}
          {...panelProps}
        />
      );
    }, [id, container, type, index, useMargins]);

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
  const container = useDashboardContainer();
  const focusedPanelId = container.select((state) => state.componentState.focusedPanelId);

  const dashboard = useDashboardContainer();

  const isPrintMode = dashboard.select((state) => state.explicitInput.viewMode) === ViewMode.PRINT;
  const isEnabled =
    !isPrintMode &&
    isProjectEnabledInLabs('labs:dashboard:deferBelowFold') &&
    (!focusedPanelId || focusedPanelId === props.id);

  return isEnabled ? <ObservedItem ref={ref} {...props} /> : <Item ref={ref} {...props} />;
});
