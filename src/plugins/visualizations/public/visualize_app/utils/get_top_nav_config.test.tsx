/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Observable } from 'rxjs';
import { Capabilities } from 'src/core/public';
import { showPublicUrlSwitch, getTopNavConfig, TopNavConfigParams } from './get_top_nav_config';
import type {
  VisualizeEditorVisInstance,
  VisualizeAppStateContainer,
  VisualizeServices,
} from '../types';
import { createVisualizeServicesMock } from './mocks';
import { sharePluginMock } from '../../../../share/public/mocks';
import { createEmbeddableStateTransferMock } from '../../../../embeddable/public/mocks';
import { visualizeAppStateStub } from './stubs';

describe('showPublicUrlSwitch', () => {
  test('returns false if "visualize" app is not available', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns false if "visualize" app is not accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      visualize: {
        show: false,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns true if "visualize" app is not available an accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      visualize: {
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
          "disableButton": true,
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
        editInLensConfig: {
          layers: {
            '0': {
              indexPatternId: 'test-id',
              timeFieldName: 'timefield-1',
              chartType: 'area',
              axisPosition: 'left',
              palette: {
                name: 'default',
                type: 'palette',
              },
              metrics: [
                {
                  agg: 'count',
                  isFullReference: false,
                  fieldName: 'document',
                  params: {},
                  color: '#68BC00',
                },
              ],
              timeInterval: 'auto',
            },
          },
          configuration: {
            fill: 0.5,
            legend: {
              isVisible: true,
              position: 'right',
              shouldTruncate: true,
              maxLines: 1,
            },
            gridLinesVisibility: {
              x: true,
              yLeft: true,
              yRight: true,
            },
            extents: {
              yLeftExtent: {
                mode: 'full',
              },
              yRightExtent: {
                mode: 'full',
              },
            },
          },
        },
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
          "disableButton": false,
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
