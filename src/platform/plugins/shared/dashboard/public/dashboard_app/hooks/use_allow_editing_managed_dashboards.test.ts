/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UI_SETTINGS } from '../../../common/constants';
import { coreServices } from '../../services/kibana_services';
import { useAllowEditingManagedDashboards } from './use_allow_editing_managed_dashboards';

jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    uiSettings: {
      get: jest.fn(),
    },
  },
}));

describe('useAllowEditingManagedDashboards', () => {
  const mockGet = coreServices.uiSettings.get as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('returns true when the advanced setting is enabled', () => {
    mockGet.mockReturnValue(true);
    expect(useAllowEditingManagedDashboards()).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(UI_SETTINGS.ALLOW_EDITING_MANAGED_DASHBOARDS, false);
  });

  it('returns false when the advanced setting is disabled', () => {
    mockGet.mockReturnValue(false);
    expect(useAllowEditingManagedDashboards()).toBe(false);
    expect(mockGet).toHaveBeenCalledWith(UI_SETTINGS.ALLOW_EDITING_MANAGED_DASHBOARDS, false);
  });
});
