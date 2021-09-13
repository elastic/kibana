/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EmbeddableChildPanel } from '../../../services/embeddable';
import { useKibana } from '../../../services/kibana_react';
import { DashboardAppServices } from '../../../types';
import type { DashboardContainer } from '../dashboard_container';

interface Props {
  container: DashboardContainer;
}

export const PrintDashboardViewport: FunctionComponent<Props> = ({ container, children }) => {
  const { services } = useKibana<DashboardAppServices>();

  const panels = container.getInput().panels;
  const panelsInOrder = Object.values(panels).sort((panelA, panelB) => {
    if (panelA.gridData.y === panelB.gridData.y) {
      return panelA.gridData.x - panelB.gridData.x;
    } else {
      return panelA.gridData.y - panelB.gridData.y;
    }
  });

  return (
    <div>
      {panelsInOrder.map((panel, id) => {
        return (
          <div className="printViewport__vis">
            <>
              <EmbeddableChildPanel
                // This key is used to force rerendering on embeddable type change while the id remains the same
                key={panel.type}
                embeddableId={panel.explicitInput.id}
                {...{ container, PanelComponent: services.embeddable.EmbeddablePanel }}
              />
              {children}
            </>
          </div>
        );
      })}
    </div>
  );
};
