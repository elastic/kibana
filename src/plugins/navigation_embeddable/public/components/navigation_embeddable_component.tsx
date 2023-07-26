/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { EuiListGroup, EuiPanel } from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { ExternalLinkComponent } from './external_link/external_link_component';
import { DASHBOARD_LINK_TYPE, NAV_HORIZONTAL_LAYOUT } from '../embeddable/types';
import { DashboardLinkComponent } from './dashboard_link/dashboard_link_component';
import { memoizedGetOrderedLinkList } from '../editor/navigation_embeddable_editor_tools';

import './navigation_embeddable_component.scss';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const links = navEmbeddable.select((state) => state.explicitInput.links);
  const layout = navEmbeddable.select((state) => state.explicitInput.layout);
  const orderedLinks = useMemo(() => {
    return memoizedGetOrderedLinkList(links);
  }, [links]);

  const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
    return Object.keys(links).reduce((prev, currentLinkId) => {
      const currentLink = links[currentLinkId];
      return {
        ...prev,
        [currentLink.id]: {
          id: currentLink.id,
          content:
            currentLink.type === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkComponent key={currentLink.id} link={currentLink} layout={layout} />
            ) : (
              <ExternalLinkComponent key={currentLink.id} link={currentLink} />
            ),
        },
      };
    }, {});
  }, [links, layout]);

  return (
    <EuiPanel
      className={`navEmbeddableComponent ${
        layout === NAV_HORIZONTAL_LAYOUT ? 'eui-xScroll' : 'eui-yScroll'
      }`}
      paddingSize="xs"
    >
      <EuiListGroup maxWidth={false} className={`${layout}LayoutWrapper`}>
        {orderedLinks.map((link) => linkItems[link.id].content)}
      </EuiListGroup>
    </EuiPanel>
  );
};
