/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../transforms', () => ({
  transformDashboardIn: jest.fn(),
  transformDashboardOut: jest.fn(),
}));

jest.mock('../scope_tooling', () => ({
  stripUnmappedKeys: jest.fn(),
}));

import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type { DashboardState } from '../types';
import { stripUnmappedKeys } from '../scope_tooling';
import { transformDashboardIn, transformDashboardOut } from '../transforms';
import { sanitize } from './sanitize';

const mockedTransformDashboardIn = jest.mocked(transformDashboardIn);
const mockedTransformDashboardOut = jest.mocked(transformDashboardOut);
const mockedStripUnmappedKeys = jest.mocked(stripUnmappedKeys);

describe('sanitize', () => {
  const baseDashboardState: DashboardState = {
    title: 'My dashboard',
    panels: [],
    pinned_panels: [],
    options: {
      auto_apply_filters: false,
      hide_panel_titles: false,
      hide_panel_borders: false,
      use_margins: true,
      sync_colors: false,
      sync_tooltips: false,
      sync_cursor: false,
    },
  };

  const storedAttributesBase: DashboardSavedObjectAttributes = {
    title: 'stored',
    description: '',
    kibanaSavedObjectMeta: {},
    panelsJSON: '[]',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets a placeholder title when title is empty or whitespace', async () => {
    mockedTransformDashboardIn.mockImplementation((state) => ({
      attributes: {
        ...storedAttributesBase,
        title: state.title ?? '',
      },
      references: [],
    }));

    mockedTransformDashboardOut.mockImplementation((attrs) => ({
      dashboardState: { title: attrs.title ?? '' },
      warnings: [],
    }));

    mockedStripUnmappedKeys.mockImplementation((state) => ({
      data: { ...baseDashboardState, title: state.title ?? '' },
      warnings: [],
    }));

    const dashboardStateSchema = {
      validate: jest.fn(() => baseDashboardState),
    };

    await sanitize(dashboardStateSchema, { ...baseDashboardState, title: '' });
    expect(mockedTransformDashboardIn).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New dashboard' })
    );

    await sanitize(dashboardStateSchema, { ...baseDashboardState, title: '   ' });
    expect(mockedTransformDashboardIn).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New dashboard' })
    );

    expect(dashboardStateSchema.validate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New dashboard' })
    );
  });

  it('does not override a non-empty title', async () => {
    mockedTransformDashboardIn.mockImplementation((state) => ({
      attributes: {
        ...storedAttributesBase,
        title: state.title ?? '',
      },
      references: [],
    }));

    mockedTransformDashboardOut.mockImplementation((attrs) => ({
      dashboardState: { title: attrs.title ?? '' },
      warnings: [],
    }));

    mockedStripUnmappedKeys.mockImplementation((state) => ({
      data: { ...baseDashboardState, title: state.title ?? '' },
      warnings: [],
    }));

    const dashboardStateSchema = {
      validate: jest.fn(() => baseDashboardState),
    };

    await sanitize(dashboardStateSchema, { ...baseDashboardState, title: 'My title' });

    expect(mockedTransformDashboardIn).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My title' })
    );
  });
});
