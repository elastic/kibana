/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { PresentationContainer } from '@kbn/presentation-containers';
import { EditorMenu } from './editor_menu';
import { DashboardAPIContext } from '../dashboard_app';
import { buildMockDashboard } from '../../mocks';

import { pluginServices } from '../../services/plugin_services';

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

const mockApi = { addNewPanel: jest.fn() } as unknown as jest.Mocked<PresentationContainer>;

describe('editor menu', () => {
  const defaultProps: ComponentProps<typeof EditorMenu> = {
    api: mockApi,
    createNewVisType: jest.fn(),
  };

  it('renders without crashing', async () => {
    render(<EditorMenu {...defaultProps} />, {
      wrapper: ({ children }) => {
        return (
          <DashboardAPIContext.Provider value={buildMockDashboard()}>
            {children}
          </DashboardAPIContext.Provider>
        );
      },
    });
  });
});
