/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupInput } from '@kbn/controls-plugin/common';
import { controlGroupInputBuilder } from '@kbn/controls-plugin/public';

import { DashboardContainerInput } from '../../../../common';
import { migrateDashboardInput } from './migrate_dashboard_input';
import { DashboardEmbeddableService } from '../../embeddable/types';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../../../mocks';

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
    const dashboardInput: DashboardContainerInput = getSampleDashboardInput();
    dashboardInput.panels = {
      panel1: getSampleDashboardPanel({ type: 'superLens', explicitInput: { id: 'panel1' } }),
      panel2: getSampleDashboardPanel({ type: 'superLens', explicitInput: { id: 'panel2' } }),
      panel3: getSampleDashboardPanel({ type: 'ultraDiscover', explicitInput: { id: 'panel3' } }),
      panel4: getSampleDashboardPanel({ type: 'ultraDiscover', explicitInput: { id: 'panel4' } }),
    };
    const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
    controlGroupInputBuilder.addOptionsListControl(controlGroupInput, {
      dataViewId: 'positions-remain-fixed',
      title: 'Results can be mixed',
      fieldName: 'theres-a-stasis',
      width: 'medium',
      grow: false,
    });
    controlGroupInputBuilder.addRangeSliderControl(controlGroupInput, {
      dataViewId: 'an-object-set-in-motion',
      title: 'The arbiter of time',
      fieldName: 'unexpressed-emotion',
      width: 'medium',
      grow: false,
    });
    controlGroupInputBuilder.addTimeSliderControl(controlGroupInput);
    dashboardInput.controlGroupInput = controlGroupInput;

    const embeddableService: DashboardEmbeddableService = {
      getEmbeddableFactory: jest.fn(() => ({
        latestVersion: '1.0.0',
        migrations: {},
      })),
    } as unknown as DashboardEmbeddableService;

    const result = migrateDashboardInput(dashboardInput, embeddableService);

    // migration run should be true because the runEmbeddableFactoryMigrations mock above returns true.
    expect(result.anyMigrationRun).toBe(true);

    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledTimes(7); // should be called 4 times for the panels, and 3 times for the controls
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('superLens');
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('ultraDiscover');
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('optionsListControl');
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('rangeSliderControl');
    expect(embeddableService.getEmbeddableFactory).toHaveBeenCalledWith('timeSlider');
  });
});
