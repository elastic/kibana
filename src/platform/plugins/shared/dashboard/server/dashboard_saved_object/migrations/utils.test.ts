/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedDashboardPanel } from '../schema';
import type { DashboardPanelState } from '../../../common';

import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from './utils';

test('convertSavedDashboardPanelToPanelState', () => {
  const savedDashboardPanel: SavedDashboardPanel = {
    type: 'search',
    embeddableConfig: {
      something: 'hi!',
    },
    id: 'savedObjectId',
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    version: '7.0.0',
  };

  expect(convertSavedDashboardPanelToPanelState(savedDashboardPanel)).toEqual({
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      something: 'hi!',
      savedObjectId: 'savedObjectId',
    },
    type: 'search',
    panelRefName: undefined,
    version: '7.0.0',
  });
});

test('convertSavedDashboardPanelToPanelState does not include undefined id', () => {
  const savedDashboardPanel: SavedDashboardPanel = {
    type: 'search',
    embeddableConfig: {
      something: 'hi!',
    },
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    version: '7.0.0',
  };

  const converted = convertSavedDashboardPanelToPanelState(savedDashboardPanel);
  expect(Object.hasOwn(converted, 'savedObjectId')).toBe(false);
});

test('convertPanelStateToSavedDashboardPanel', () => {
  const dashboardPanel: DashboardPanelState = {
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      something: 'hi!',
      id: '123',
      savedObjectId: 'savedObjectId',
    },
    type: 'search',
  };

  expect(convertPanelStateToSavedDashboardPanel('123', dashboardPanel)).toEqual({
    type: 'search',
    embeddableConfig: {
      something: 'hi!',
    },
    id: 'savedObjectId',
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
  });
});

test('convertPanelStateToSavedDashboardPanel will not add an undefined id when not needed', () => {
  const dashboardPanel: DashboardPanelState = {
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      something: 'hi!',
    },
    type: 'search',
  };

  const converted = convertPanelStateToSavedDashboardPanel('123', dashboardPanel);
  expect(Object.hasOwn(converted, 'id')).toBe(false);
});

test('convertPanelStateToSavedDashboardPanel will not leave title as part of embeddable config', () => {
  const dashboardPanel: DashboardPanelState = {
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      title: 'title',
    },
    type: 'search',
  };

  const converted = convertPanelStateToSavedDashboardPanel('123', dashboardPanel);
  expect(Object.hasOwn(converted.embeddableConfig, 'title')).toBe(false);
  expect(converted.title).toBe('title');
});

test('convertPanelStateToSavedDashboardPanel retains legacy version info', () => {
  const dashboardPanel: DashboardPanelState = {
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      title: 'title',
    },
    type: 'search',
    version: '8.10.0',
  };

  const converted = convertPanelStateToSavedDashboardPanel('123', dashboardPanel);
  expect(converted.version).toBe('8.10.0');
});
