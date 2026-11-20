/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { reportPanelSelectionStarted } from './report_panel_selection_started';

describe('reportPanelSelectionStarted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the selection started event', () => {
    reportPanelSelectionStarted();

    expect(coreServices.analytics.reportEvent).toHaveBeenCalledWith(
      'dashboard_panel_selection_started',
      {}
    );
  });

  it('logs a reporting error instead of throwing it', () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    (coreServices.analytics.reportEvent as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Event type "dashboard_panel_selection_started" is not registered');
    });

    expect(() => reportPanelSelectionStarted()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Event type "dashboard_panel_selection_started" is not registered')
    );
  });
});
