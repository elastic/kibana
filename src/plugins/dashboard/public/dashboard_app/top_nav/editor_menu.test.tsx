/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EditorMenu } from './editor_menu';
import { buildMockDashboard } from '../../mocks';

import { pluginServices } from '../../services/plugin_services';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { DashboardApi } from '../../dashboard_api/types';

jest.mock('../../services/plugin_services', () => {
  const module = jest.requireActual('../../services/plugin_services');

  const _pluginServices = (module.pluginServices as typeof pluginServices).getServices();

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
      getServices: jest.fn().mockReturnValue(_pluginServices),
    },
  };
});

describe('editor menu', () => {
  it('renders without crashing', async () => {
    render(<EditorMenu createNewVisType={jest.fn()} />, {
      wrapper: ({ children }) => {
        return (
          <DashboardContext.Provider value={buildMockDashboard() as DashboardApi}>
            {children}
          </DashboardContext.Provider>
        );
      },
    });
  });
});
