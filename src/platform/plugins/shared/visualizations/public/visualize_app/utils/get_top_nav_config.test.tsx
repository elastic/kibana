/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { Capabilities } from '@kbn/core/public';
import { showPublicUrlSwitch, getTopNavConfig, TopNavConfigParams } from './get_top_nav_config';
import type {
  VisualizeEditorVisInstance,
  VisualizeAppStateContainer,
  VisualizeServices,
} from '../types';
import { createVisualizeServicesMock } from './mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { createEmbeddableStateTransferMock } from '@kbn/embeddable-plugin/public/mocks';
import { visualizeAppStateStub } from './stubs';

describe('showPublicUrlSwitch', () => {
  test('returns false if "visualize_v2" app is not available', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns false if "visualize_v2" app is not accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      visualize_v2: {
        show: false,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns true if "visualize_v2" app is not available an accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      visualize_v2: {
        show: true,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(true);
  });
});

describe('getTopNavConfig', () => {
  const stateContainerGetStateMock = jest.fn(() => visualizeAppStateStub);
  const stateContainer = {
    getState: stateContainerGetStateMock,
    state$: new Observable(),
    transitions: {
      updateVisState: jest.fn(),
      set: jest.fn(),
    },
  } as unknown as VisualizeAppStateContainer;
  const mockServices = createVisualizeServicesMock();
  const share = sharePluginMock.createStartContract();
  const services = {
    ...mockServices,
    visualizeCapabilities: {
      save: true,
    },
    dashboardCapabilities: {
      showWriteControls: true,
    },
    share,
  };
  test('returns correct links if the save visualize capabilities are set to false', () => {
    const vis = {
      savedVis: {
        id: 'test',
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'alias_id',
        },
      },
      vis: {
        type: {
          title: 'TSVB',
        },
      },
    } as VisualizeEditorVisInstance;
    const novizSaveServices = {
      ...services,
      visualizeCapabilities: {
        save: false,
      },
    };
    const topNavLinks = getTopNavConfig(
      {
        hasUnsavedChanges: false,
        setHasUnsavedChanges: jest.fn(),
        hasUnappliedChanges: false,
        onOpenInspector: jest.fn(),
        originatingApp: 'dashboards',
        setOriginatingApp: jest.fn(),
        visInstance: vis,
        stateContainer,
        visualizationIdFromUrl: undefined,
        stateTransfer: createEmbeddableStateTransferMock(),
      } as unknown as TopNavConfigParams,
      novizSaveServices as unknown as VisualizeServices
    );

    expect(topNavLinks).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "Open Inspector for visualization",
          "disableButton": [Function],
          "id": "inspector",
          "label": "inspect",
          "run": undefined,
          "testId": "openInspectorButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Share Visualization",
          "disableButton": false,
          "id": "share",
          "label": "share",
          "run": [Function],
          "testId": "shareTopNavButton",
        },
        Object {
          "description": "Return to the last app without saving changes",
          "emphasize": false,
          "id": "cancel",
          "label": "Cancel",
          "run": [Function],
          "testId": "visualizeCancelAndReturnButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Finish editing visualization and return to the last app",
          "disableButton": false,
          "emphasize": true,
          "iconType": "checkInCircleFilled",
          "id": "saveAndReturn",
          "label": "Save and return",
          "run": [Function],
          "testId": "visualizesaveAndReturnButton",
          "tooltip": [Function],
        },
      ]
    `);
  });
  test('returns correct links if the originating app is undefined', () => {
    const vis = {
      savedVis: {
        id: 'test',
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'alias_id',
        },
      },
      vis: {
        type: {
          title: 'TSVB',
        },
      },
    } as VisualizeEditorVisInstance;
    const topNavLinks = getTopNavConfig(
      {
        hasUnsavedChanges: false,
        setHasUnsavedChanges: jest.fn(),
        hasUnappliedChanges: false,
        onOpenInspector: jest.fn(),
        originatingApp: undefined,
        setOriginatingApp: jest.fn(),
        visInstance: vis,
        stateContainer,
        visualizationIdFromUrl: undefined,
        stateTransfer: createEmbeddableStateTransferMock(),
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(topNavLinks).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "Open Inspector for visualization",
          "disableButton": [Function],
          "id": "inspector",
          "label": "inspect",
          "run": undefined,
          "testId": "openInspectorButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Share Visualization",
          "disableButton": false,
          "id": "share",
          "label": "share",
          "run": [Function],
          "testId": "shareTopNavButton",
        },
        Object {
          "description": "Save Visualization",
          "disableButton": false,
          "emphasize": true,
          "iconType": "save",
          "id": "save",
          "label": "Save",
          "run": [Function],
          "testId": "visualizeSaveButton",
          "tooltip": [Function],
        },
      ]
    `);
  });

  test('navigates to origin app and path on cancel', async () => {
    const vis = {
      savedVis: {
        id: 'test',
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'alias_id',
        },
      },
      vis: {
        type: {
          title: 'TSVB',
        },
      },
    } as VisualizeEditorVisInstance;
    const mockNavigateToApp = jest.fn();
    const topNavLinks = getTopNavConfig(
      {
        hasUnsavedChanges: false,
        setHasUnsavedChanges: jest.fn(),
        hasUnappliedChanges: false,
        onOpenInspector: jest.fn(),
        originatingApp: 'testApp',
        originatingPath: '/testPath',
        setOriginatingApp: jest.fn(),
        visInstance: vis,
        stateContainer,
        visualizationIdFromUrl: undefined,
        stateTransfer: createEmbeddableStateTransferMock(),
      } as unknown as TopNavConfigParams,
      {
        ...services,
        application: { navigateToApp: mockNavigateToApp },
      } as unknown as VisualizeServices
    );

    const executionFunction = topNavLinks.find(({ id }) => id === 'cancel')?.run;
    const mockAnchorElement = document.createElement('div');
    await executionFunction?.(mockAnchorElement);
    expect(mockNavigateToApp).toHaveBeenCalledWith('testApp', { path: '/testPath' });
  });

  test('returns correct links for by reference visualization', () => {
    const vis = {
      savedVis: {
        id: 'test',
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'alias_id',
        },
      },
      vis: {
        type: {
          title: 'TSVB',
        },
      },
    } as VisualizeEditorVisInstance;
    const topNavLinks = getTopNavConfig(
      {
        hasUnsavedChanges: false,
        setHasUnsavedChanges: jest.fn(),
        hasUnappliedChanges: false,
        onOpenInspector: jest.fn(),
        originatingApp: 'dashboards',
        setOriginatingApp: jest.fn(),
        visInstance: vis,
        stateContainer,
        visualizationIdFromUrl: undefined,
        stateTransfer: createEmbeddableStateTransferMock(),
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(topNavLinks).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "Open Inspector for visualization",
          "disableButton": [Function],
          "id": "inspector",
          "label": "inspect",
          "run": undefined,
          "testId": "openInspectorButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Share Visualization",
          "disableButton": false,
          "id": "share",
          "label": "share",
          "run": [Function],
          "testId": "shareTopNavButton",
        },
        Object {
          "description": "Return to the last app without saving changes",
          "emphasize": false,
          "id": "cancel",
          "label": "Cancel",
          "run": [Function],
          "testId": "visualizeCancelAndReturnButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Save Visualization",
          "disableButton": false,
          "emphasize": false,
          "iconType": undefined,
          "id": "save",
          "label": "Save as",
          "run": [Function],
          "testId": "visualizeSaveButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Finish editing visualization and return to the last app",
          "disableButton": false,
          "emphasize": true,
          "iconType": "checkInCircleFilled",
          "id": "saveAndReturn",
          "label": "Save and return",
          "run": [Function],
          "testId": "visualizesaveAndReturnButton",
          "tooltip": [Function],
        },
      ]
    `);
  });

  test('returns correct links for by value visualization', () => {
    const vis = {
      savedVis: {
        id: undefined,
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'alias_id',
        },
      },
      vis: {
        type: {
          title: 'TSVB',
        },
      },
    } as VisualizeEditorVisInstance;
    const topNavLinks = getTopNavConfig(
      {
        hasUnsavedChanges: false,
        setHasUnsavedChanges: jest.fn(),
        hasUnappliedChanges: false,
        onOpenInspector: jest.fn(),
        originatingApp: 'dashboards',
        setOriginatingApp: jest.fn(),
        visInstance: vis,
        stateContainer,
        visualizationIdFromUrl: undefined,
        stateTransfer: createEmbeddableStateTransferMock(),
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(topNavLinks).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": "Open Inspector for visualization",
          "disableButton": [Function],
          "id": "inspector",
          "label": "inspect",
          "run": undefined,
          "testId": "openInspectorButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Share Visualization",
          "disableButton": true,
          "id": "share",
          "label": "share",
          "run": [Function],
          "testId": "shareTopNavButton",
        },
        Object {
          "description": "Return to the last app without saving changes",
          "emphasize": false,
          "id": "cancel",
          "label": "Cancel",
          "run": [Function],
          "testId": "visualizeCancelAndReturnButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Save Visualization",
          "disableButton": false,
          "emphasize": false,
          "iconType": undefined,
          "id": "save",
          "label": "Save to library",
          "run": [Function],
          "testId": "visualizeSaveButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Finish editing visualization and return to the last app",
          "disableButton": false,
          "emphasize": true,
          "iconType": "checkInCircleFilled",
          "id": "saveAndReturn",
          "label": "Save and return",
          "run": [Function],
          "testId": "visualizesaveAndReturnButton",
          "tooltip": [Function],
        },
      ]
    `);
  });

  test('returns correct for visualization that allows editing in Lens editor', () => {
    const vis = {
      savedVis: {
        id: 'test',
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: 'alias_id',
        },
      },
      vis: {
        type: {
          title: 'TSVB',
        },
      },
    } as VisualizeEditorVisInstance;
    const topNavLinks = getTopNavConfig(
      {
        hasUnsavedChanges: false,
        setHasUnsavedChanges: jest.fn(),
        hasUnappliedChanges: false,
        onOpenInspector: jest.fn(),
        originatingApp: 'dashboards',
        setOriginatingApp: jest.fn(),
        visInstance: vis,
        stateContainer,
        visualizationIdFromUrl: undefined,
        stateTransfer: createEmbeddableStateTransferMock(),
        displayEditInLensItem: true,
        hideLensBadge: false,
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(topNavLinks).toMatchInlineSnapshot(`
      Array [
        Object {
          "className": "visNavItem__goToLens",
          "description": "Go to Lens with your current configuration",
          "emphasize": false,
          "id": "goToLens",
          "label": "Edit visualization in Lens",
          "run": [Function],
          "testId": "visualizeEditInLensButton",
        },
        Object {
          "description": "Open Inspector for visualization",
          "disableButton": [Function],
          "id": "inspector",
          "label": "inspect",
          "run": undefined,
          "testId": "openInspectorButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Share Visualization",
          "disableButton": false,
          "id": "share",
          "label": "share",
          "run": [Function],
          "testId": "shareTopNavButton",
        },
        Object {
          "description": "Return to the last app without saving changes",
          "emphasize": false,
          "id": "cancel",
          "label": "Cancel",
          "run": [Function],
          "testId": "visualizeCancelAndReturnButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Save Visualization",
          "disableButton": false,
          "emphasize": false,
          "iconType": undefined,
          "id": "save",
          "label": "Save as",
          "run": [Function],
          "testId": "visualizeSaveButton",
          "tooltip": [Function],
        },
        Object {
          "description": "Finish editing visualization and return to the last app",
          "disableButton": false,
          "emphasize": true,
          "iconType": "checkInCircleFilled",
          "id": "saveAndReturn",
          "label": "Save and return",
          "run": [Function],
          "testId": "visualizesaveAndReturnButton",
          "tooltip": [Function],
        },
      ]
    `);
  });
});
