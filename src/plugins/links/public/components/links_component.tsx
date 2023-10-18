/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiListGroup, EuiPanel } from '@elastic/eui';
import { useLinks } from '../embeddable/links_embeddable';
import { ExternalLinkComponent } from './external_link/external_link_component';
import { DashboardLinkComponent } from './dashboard_link/dashboard_link_component';
import { memoizedGetOrderedLinkList } from '../editor/links_editor_tools';
import {
  DASHBOARD_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';

import './links_component.scss';

export const LinksComponent = () => {
  const linksEmbeddable = useLinks();
  const links = linksEmbeddable.select((state) => state.componentState.links);
  const layout = linksEmbeddable.select((state) => state.componentState.layout);

  const orderedLinks = useMemo(() => {
    if (!links) return [];
    return memoizedGetOrderedLinkList(links);
  }, [links]);

  const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
    return (links ?? []).reduce((prev, currentLink) => {
      return {
        ...prev,
        [currentLink.id]: {
          id: currentLink.id,
          content:
            currentLink.type === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkComponent
                key={currentLink.id}
                link={currentLink}
                layout={layout ?? LINKS_VERTICAL_LAYOUT}
              />
            ) : (
              <ExternalLinkComponent
                key={currentLink.id}
                link={currentLink}
                layout={layout ?? LINKS_VERTICAL_LAYOUT}
              />
            ),
        },
      };
    }, {});
  }, [links, layout]);

  return (
    <EuiPanel
      className={`linksComponent ${
        layout === LINKS_HORIZONTAL_LAYOUT ? 'eui-xScroll' : 'eui-yScroll'
      }`}
      paddingSize="xs"
      data-test-subj="links--component"
    >
      <EuiListGroup
        maxWidth={false}
        className={`${layout}LayoutWrapper`}
        data-test-subj="links--component--listGroup"
      >
        {orderedLinks.map((link) => linkItems[link.id].content)}
      </EuiListGroup>
    </EuiPanel>
  );
};
