/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiPanel } from '@elastic/eui';

import { DASHBOARD_LINK_TYPE } from '../embeddable/types';
import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { DashboardLinkComponent } from './dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from './external_link/external_link_component';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const links = navEmbeddable.select((state) => state.explicitInput.links);

  /** TODO: Render this as a list **or** "tabs" as part of https://github.com/elastic/kibana/issues/154357 */
  return (
    <EuiPanel className="eui-yScroll">
      {Object.keys(links).map((linkId) => {
        return (
          <EuiPanel
            id={`navigationLink--${linkId}`}
            key={`${linkId}`}
            paddingSize="none"
            hasShadow={false}
          >
            {links[linkId].type === DASHBOARD_LINK_TYPE ? (
              <DashboardLinkComponent link={links[linkId]} />
            ) : (
              <ExternalLinkComponent link={links[linkId]} />
            )}
          </EuiPanel>
        );
      })}
    </EuiPanel>
  );
};
