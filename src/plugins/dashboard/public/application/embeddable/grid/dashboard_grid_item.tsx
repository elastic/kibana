/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useEffect, FC } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';

import {
  EmbeddableChildPanel,
  EmbeddablePhaseEvent,
  ViewMode,
} from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../types';
import { DashboardContainer } from '..';
import { pluginServices } from '../../../services/plugin_services';

type PanelProps = Pick<EmbeddableChildPanel, 'container'>;
type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

interface Props extends PanelProps, DivProps {
  id: DashboardPanelState['explicitInput']['id'];
  index?: number;
  type: DashboardPanelState['type'];
  container: DashboardContainer;
  focusedPanelId?: string;
  expandedPanelId?: string;
  key: string;
  isRenderable?: boolean;
  onPanelStatusChange?: (info: EmbeddablePhaseEvent) => void;
}

const Item = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      container,
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

export const ObservedItem: FC<Props> = (props: Props) => {
  const [intersection, updateIntersection] = useState<IntersectionObserverEntry>();
  const [isRenderable, setIsRenderable] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const observerRef = useRef(
    new window.IntersectionObserver(([value]) => updateIntersection(value), {
      root: panelRef.current,
    })
  );

  useEffect(() => {
    const { current: currentObserver } = observerRef;
    currentObserver.disconnect();
    const { current } = panelRef;

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
};

export const DashboardGridItem: FC<Props> = (props: Props) => {
  const {
    settings: { isProjectEnabledInLabs },
  } = pluginServices.getServices();

  const isPrintMode = props.container.getInput().viewMode === ViewMode.PRINT;
  const isEnabled = !isPrintMode && isProjectEnabledInLabs('labs:dashboard:deferBelowFold');

  return isEnabled ? <ObservedItem {...props} /> : <Item {...props} />;
};
