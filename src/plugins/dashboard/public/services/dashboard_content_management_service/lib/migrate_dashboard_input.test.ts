/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSampleDashboardInput, getSampleDashboardPanel } from '../../../mocks';
import { embeddableService } from '../../kibana_services';
import { SavedDashboardInput } from '../types';
import { migrateDashboardInput } from './migrate_dashboard_input';

jest.mock('@kbn/embeddable-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/embeddable-plugin/public'),
    runEmbeddableFactoryMigrations: jest
      .fn()
      .mockImplementation((input) => ({ input, migrationRun: true })),
  };
});

describe('Migrate dashboard input', () => {
  it('should run factory migrations on all Dashboard content', () => {
    const dashboardInput: SavedDashboardInput = getSampleDashboardInput();
    dashboardInput.panels = {
      panel1: getSampleDashboardPanel({ type: 'superLens', explicitInput: { id: 'panel1' } }),
      panel2: getSampleDashboardPanel({ type: 'superLens', explicitInput: { id: 'panel2' } }),
      panel3: getSampleDashboardPanel({ type: 'ultraDiscover', explicitInput: { id: 'panel3' } }),
      panel4: getSampleDashboardPanel({ type: 'ultraDiscover', explicitInput: { id: 'panel4' } }),
    };

    embeddableService.getEmbeddableFactory = jest.fn(() => ({
      latestVersion: '1.0.0',
      migrations: {},
    })) as unknown as typeof embeddableService.getEmbeddableFactory;

    const result = migrateDashboardInput(dashboardInput);

    // migration run should be true because the runEmbeddableFactoryMigrations mock above returns true.
    expect(result.anyMigrationRun).toBe(true);

    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledTimes(4); // should be called 4 times for the panels, and 3 times for the controls
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('superLens');
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('ultraDiscover');
  });
});
