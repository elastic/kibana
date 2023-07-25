/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { EuiPanel } from '@elastic/eui';

import { DASHBOARD_LINK_TYPE } from '../../common/content_management';
import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { ExternalLinkComponent } from './external_link/external_link_component';
import { DashboardLinkComponent } from './dashboard_link/dashboard_link_component';
import { memoizedGetOrderedLinkList } from '../editor/navigation_embeddable_editor_tools';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const links = navEmbeddable.select((state) => state.output.attributes?.links);

  const orderedLinks = useMemo(() => {
    if (!links) return [];
    return memoizedGetOrderedLinkList(links);
  }, [links]);

  /** TODO: Render this as a list **or** "tabs" as part of https://github.com/elastic/kibana/issues/154357 */
  return (
    <EuiPanel className="eui-yScroll">
      {orderedLinks.map((link) => {
        return (
          <EuiPanel
            id={`navigationLink--${link.id}`}
            key={`${link.id}`}
            paddingSize="none"
            hasShadow={false}
          >
            {link.type === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkComponent link={link} />
            ) : (
              <ExternalLinkComponent link={link} />
            )}
          </EuiPanel>
        );
      })}
    </EuiPanel>
  );
};
