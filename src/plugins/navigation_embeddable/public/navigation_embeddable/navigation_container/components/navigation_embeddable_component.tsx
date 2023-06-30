/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { EuiPanel, EuiButtonEmpty } from '@elastic/eui';

import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { NavigationEmbeddableLink } from './navigation_embeddable_link';
import { useNavigationEmbeddable } from '../embeddable/navigation_container';

// import './navigation_embeddable.scss';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const panels = navEmbeddable.select((state) => state.explicitInput.panels);

  return (
    <EuiPanel className="eui-yScroll">
      <div ref={embeddableRoot}>
        {Object.keys(panels).map((panelId) => {
          return (
            <NavigationEmbeddableLink
              embeddableId={panels[panelId].explicitInput.id}
              embeddableType={panels[panelId].type}
            />
          );
        })}
      </div>

      <EuiButtonEmpty onClick={() => navEmbeddable.openAddLinkFlyout()} iconType="plusInCircle">
        {NavEmbeddableStrings.component.getAddButtonLabel()}
      </EuiButtonEmpty>
    </EuiPanel>
  );
};
