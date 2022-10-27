/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CoreStart } from '@kbn/core/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ExitFullScreenButton } from '@kbn/kibana-react-plugin/public';

import { DashboardGrid } from '../grid';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardEmptyScreen } from '../empty_screen/dashboard_empty_screen';
import { useDashboardContainerContext } from '../../dashboard_container_renderer';
import { DashboardContainer, DashboardLoadedInfo } from '../../embeddable/dashboard_container';

export interface DashboardViewportProps {
  container: DashboardContainer;
  onDataLoaded?: (data: DashboardLoadedInfo) => void;
}

export const DashboardViewport = ({ onDataLoaded, container }: DashboardViewportProps) => {
  const { chrome } = pluginServices.getServices();

  const {
    actions: { setFullScreenMode },
    useEmbeddableSelector: select,
    useEmbeddableDispatch,
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const panelCount = Object.keys(select((state) => state.explicitInput.panels)).length;
  const isEditMode = select((state) => state.explicitInput.viewMode) === ViewMode.EDIT;
  const dashboardTitle = select((state) => state.explicitInput.title);
  const description = select((state) => state.explicitInput.description);
  const useMargins = select((state) => state.explicitInput.options.useMargins);

  const isFullScreenMode = select((state) => state.componentState.fullScreenMode);

  // TODO Is embedded externally
  return (
    <>
      <div
        data-shared-items-count={panelCount}
        data-shared-items-container
        data-title={dashboardTitle}
        data-description={description}
        className={useMargins ? 'dshDashboardViewport-withMargins' : 'dshDashboardViewport'}
      >
        {isFullScreenMode && (
          // TODO: Replace with Shared UX ExitFullScreenButton once https://github.com/elastic/kibana/issues/140311 is resolved
          <ExitFullScreenButton
            chrome={chrome as CoreStart['chrome']}
            onExitFullScreenMode={() => dispatch(setFullScreenMode(false))}
            toggleChrome={true}
          />
        )}
        {panelCount === 0 && (
          <div className="dshDashboardEmptyScreen">
            <DashboardEmptyScreen isEditMode={isEditMode} />
          </div>
        )}
        <DashboardGrid onDataLoaded={onDataLoaded} container={container} />
      </div>
    </>
  );
};
