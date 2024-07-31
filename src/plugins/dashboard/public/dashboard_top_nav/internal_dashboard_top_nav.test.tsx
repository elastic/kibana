/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render, screen } from '@testing-library/react';
import { buildMockDashboard } from '../mocks';
import DashboardTopNavWithContext from './dashboard_top_nav_with_context';
import { InternalDashboardTopNav } from './internal_dashboard_top_nav';
import React, { ComponentProps } from 'react';
import { DashboardAPIContext } from '../dashboard_app/dashboard_app';
import { PluginServiceRegistry } from '@kbn/presentation-util-plugin/public';

jest.mock('../services/plugin_services', () => {
  const module = jest.requireActual('../services/plugin_services');
  const _pluginServices = module.pluginServices.getServices();

  const mockRegistry: { [key: string]: PluginServiceRegistry<typeof _pluginServices> } = {};
  jest
    .spyOn(_pluginServices.embeddable, 'getEmbeddableFactories')
    .mockReturnValue(new Map().values());
  jest.spyOn(_pluginServices.uiActions, 'getTriggerCompatibleActions').mockResolvedValue([]);
  jest.spyOn(_pluginServices.visualizations, 'getByGroup').mockReturnValue([]);
  jest.spyOn(_pluginServices.visualizations, 'getAliases').mockReturnValue([]);

  return {
    ...module,
    pluginServices: {
      ...module.pluginServices,
      registry: mockRegistry,
      getServices: jest.fn().mockReturnValue(_pluginServices),
    },
  };
});

describe('Internal dashboard top nav', () => {
  const defaultProps: ComponentProps<typeof InternalDashboardTopNav> = {
    redirectTo: jest.fn(),
  };
  it('should not render the managed badge by default', async () => {
    render(<InternalDashboardTopNav {...defaultProps} />, {
      wrapper: ({ children }) => {
        return (
          <DashboardAPIContext.Provider value={buildMockDashboard()}>
            {children}
          </DashboardAPIContext.Provider>
        );
      },
    });
  });
  xit('should render the managed badge when the dashboard is managed', async () => {
    const container = buildMockDashboard();
    container.dispatch.setManaged(true);
    DashboardTopNavWithContext({ dashboardContainer: container, redirectTo: jest.fn() });
    InternalDashboardTopNav({ redirectTo: jest.fn() });
    expect(await screen.findByText('Managed')).toBeInTheDocument();
  });
});
