/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroup, EuiPanel } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import useMap from 'react-use/lib/useMap';
import {
  DASHBOARD_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { memoizedGetOrderedLinkList } from '../react_embeddable/utils';
import { DashboardLinkComponent } from './dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from './external_link/external_link_component';

import './links_component.scss';
import { useLinks, useLinksAttributes } from './links_hooks';

export const LinksComponent = () => {
  const linksEmbeddable = useLinks();
  const linksAttributes = useLinksAttributes();

  const [linksLoading, { set: setLinkIsLoading }] = useMap(
    Object.fromEntries(
      (linksAttributes?.links ?? []).map((link) => {
        return [link.id, true];
      })
    )
  );

  useEffect(() => {
    if (Object.values(linksLoading).includes(true)) {
      linksEmbeddable.onLoading();
    } else {
      linksEmbeddable.onRender();
    }
  }, [linksLoading, linksEmbeddable]);

  const orderedLinks = useMemo(() => {
    if (!linksAttributes?.links) return [];
    return memoizedGetOrderedLinkList(linksAttributes?.links);
  }, [linksAttributes]);

  const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
    return (linksAttributes?.links ?? []).reduce((prev, currentLink) => {
      return {
        ...prev,
        [currentLink.id]: {
          id: currentLink.id,
          content:
            currentLink.type === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkComponent
                key={currentLink.id}
                link={currentLink}
                layout={linksAttributes?.layout ?? LINKS_VERTICAL_LAYOUT}
                onLoading={() => setLinkIsLoading(currentLink.id, true)}
                onRender={() => setLinkIsLoading(currentLink.id, false)}
              />
            ) : (
              <ExternalLinkComponent
                key={currentLink.id}
                link={currentLink}
                layout={linksAttributes?.layout ?? LINKS_VERTICAL_LAYOUT}
                onRender={() => setLinkIsLoading(currentLink.id, false)}
              />
            ),
        },
      };
    }, {});
  }, [linksAttributes?.links, linksAttributes?.layout, setLinkIsLoading]);

  return (
    <EuiPanel
      className={`linksComponent ${
        linksAttributes?.layout === LINKS_HORIZONTAL_LAYOUT ? 'eui-xScroll' : 'eui-yScroll'
      }`}
      paddingSize="xs"
      data-test-subj="links--component"
    >
      <EuiListGroup
        maxWidth={false}
        className={`${linksAttributes?.layout ?? LINKS_VERTICAL_LAYOUT}LayoutWrapper`}
        data-test-subj="links--component--listGroup"
      >
        {orderedLinks.map((link) => linkItems[link.id].content)}
      </EuiListGroup>
    </EuiPanel>
  );
};
