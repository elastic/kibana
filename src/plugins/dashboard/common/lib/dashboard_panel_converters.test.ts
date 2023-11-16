/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from './dashboard_panel_converters';
import { SavedDashboardPanel } from '../content_management';
import { DashboardPanelState } from '../dashboard_container/types';
import { EmbeddableInput } from '@kbn/embeddable-plugin/common/types';

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
      id: '123',
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
  expect(converted.hasOwnProperty('savedObjectId')).toBe(false);
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
    } as EmbeddableInput,
    type: 'search',
  };

  expect(convertPanelStateToSavedDashboardPanel(dashboardPanel)).toEqual({
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
      id: '123',
      something: 'hi!',
    } as EmbeddableInput,
    type: 'search',
  };

  const converted = convertPanelStateToSavedDashboardPanel(dashboardPanel);
  expect(converted.hasOwnProperty('id')).toBe(false);
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
      id: '123',
      title: 'title',
    } as EmbeddableInput,
    type: 'search',
  };

  const converted = convertPanelStateToSavedDashboardPanel(dashboardPanel);
  expect(converted.embeddableConfig.hasOwnProperty('title')).toBe(false);
  expect(converted.title).toBe('title');
});

test('convertPanelStateToSavedDashboardPanel retains legacy version info when not passed removeLegacyVersion', () => {
  const dashboardPanel: DashboardPanelState = {
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      id: '123',
      title: 'title',
    } as EmbeddableInput,
    type: 'search',
    version: '8.10.0',
  };

  const converted = convertPanelStateToSavedDashboardPanel(dashboardPanel);
  expect(converted.version).toBe('8.10.0');
});

test('convertPanelStateToSavedDashboardPanel removes legacy version info when passed removeLegacyVersion', () => {
  const dashboardPanel: DashboardPanelState = {
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    explicitInput: {
      id: '123',
      title: 'title',
    } as EmbeddableInput,
    type: 'search',
    version: '8.10.0',
  };

  const converted = convertPanelStateToSavedDashboardPanel(dashboardPanel, true);
  expect(converted.version).not.toBeDefined();
});
