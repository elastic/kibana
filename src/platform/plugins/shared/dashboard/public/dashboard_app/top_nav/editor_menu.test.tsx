/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { buildMockDashboardApi } from '../../mocks';
import { EditorMenu } from './editor_menu';

import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { uiActionsService, visualizationsService } from '../../services/kibana_services';

jest.spyOn(uiActionsService, 'getTriggerCompatibleActions').mockResolvedValue([]);
jest.spyOn(visualizationsService, 'getByGroup').mockReturnValue([]);
jest.spyOn(visualizationsService, 'getAliases').mockReturnValue([]);

describe('editor menu', () => {
  it('renders without crashing', async () => {
    const { api } = buildMockDashboardApi();
    render(<EditorMenu createNewVisType={jest.fn()} />, {
      wrapper: ({ children }) => {
        return <DashboardContext.Provider value={api}>{children}</DashboardContext.Provider>;
      },
    });
  });
});
