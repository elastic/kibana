/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import React from 'react';
import { DashboardAPIContext } from '../dashboard_app/dashboard_app';
import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../services/plugin_services';
import {
  InternalDashboardTopNav,
  InternalDashboardTopNavProps,
} from './internal_dashboard_top_nav';
export interface DashboardTopNavProps extends InternalDashboardTopNavProps {
  dashboardContainer: DashboardContainer;
}

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const DashboardTopNavWithContext = (props: DashboardTopNavProps) => {
  const {
    spaces: { spacesApi },
  } = pluginServices.getServices();
  const SpacesContextWrapper =
    spacesApi?.ui.components.getSpacesContextProvider ?? getEmptyFunctionComponent;
  return (
    <SpacesContextWrapper>
      <DashboardAPIContext.Provider value={props.dashboardContainer}>
        <InternalDashboardTopNav {...props} />
      </DashboardAPIContext.Provider>
    </SpacesContextWrapper>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardTopNavWithContext;
