/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiPanel } from '@elastic/eui';

import { NavigationEmbeddableLink } from './navigation_embeddable_link';
import { useNavigationEmbeddable } from '../embeddable/navigation_container';

// import './navigation_embeddable.scss';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const panels = navEmbeddable.select((state) => state.explicitInput.panels);

  return (
    <EuiPanel className="eui-yScroll">
      {Object.keys(panels).map((panelId, index) => {
        const embeddableId = panels[panelId].explicitInput.id;
        return (
          <span id={`navigationLink--${embeddableId}`} key={`${embeddableId}`}>
            <NavigationEmbeddableLink
              embeddableId={embeddableId}
              embeddableType={panels[panelId].type}
            />
          </span>
        );
      })}
    </EuiPanel>
  );
};
