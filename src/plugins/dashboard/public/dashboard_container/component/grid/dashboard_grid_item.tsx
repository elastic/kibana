/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useEffect } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';

import {
  EmbeddableChildPanel,
  EmbeddablePhaseEvent,
  ViewMode,
} from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { pluginServices } from '../../../services/plugin_services';
import { useDashboardContainerContext } from '../../dashboard_container_context';

type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

export interface Props extends DivProps {
  id: DashboardPanelState['explicitInput']['id'];
  index?: number;
  type: DashboardPanelState['type'];
  focusedPanelId?: string;
  expandedPanelId?: string;
  key: string;
  isRenderable?: boolean;
  onPanelStatusChange?: (info: EmbeddablePhaseEvent) => void;
}

const Item = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      expandedPanelId,
      focusedPanelId,
      id,
      index,
      type,
      onPanelStatusChange,
      isRenderable = true,
      // The props below are passed from ReactGridLayoutn and need to be merged with their counterparts.
      // https://github.com/react-grid-layout/react-grid-layout/issues/1241#issuecomment-658306889
      children,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const {
      embeddable: { EmbeddablePanel: PanelComponent },
    } = pluginServices.getServices();
    const { embeddableInstance: container } = useDashboardContainerContext();

    const expandPanel = expandedPanelId !== undefined && expandedPanelId === id;
    const hidePanel = expandedPanelId !== undefined && expandedPanelId !== id;
    const classes = classNames({
      'dshDashboardGrid__item--expanded': expandPanel,
      'dshDashboardGrid__item--hidden': hidePanel,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      printViewport__vis: container.getInput().viewMode === ViewMode.PRINT,
    });

    return (
      <div
        style={{ ...style, zIndex: focusedPanelId === id ? 2 : 'auto' }}
        className={[classes, className].join(' ')}
        data-test-subj="dashboardPanel"
        ref={ref}
        {...rest}
      >
        {isRenderable ? (
          <>
            <EmbeddableChildPanel
              // This key is used to force rerendering on embeddable type change while the id remains the same
              key={type}
              embeddableId={id}
              index={index}
              onPanelStatusChange={onPanelStatusChange}
              {...{ container, PanelComponent }}
            />
            {children}
          </>
        ) : (
          <div className="embPanel embPanel-isLoading">
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

  const { useEmbeddableSelector: select } = useDashboardContainerContext();

  const isPrintMode = select((state) => state.explicitInput.viewMode) === ViewMode.PRINT;
  const isEnabled = !isPrintMode && isProjectEnabledInLabs('labs:dashboard:deferBelowFold');

  return isEnabled ? <ObservedItem ref={ref} {...props} /> : <Item ref={ref} {...props} />;
});
