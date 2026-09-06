/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import type { Capabilities } from '@kbn/core/public';
import type { TopNavConfigParams } from './get_top_nav_config';
import { showPublicUrlSwitch, getTopNavConfig } from './get_top_nav_config';
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

const getMenuItemIds = (result: ReturnType<typeof getTopNavConfig>) =>
  result.menu.items?.map(({ id }) => id) ?? [];

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
  share.availableIntegrations = jest.fn().mockReturnValue([]);
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

  const defaultParams = {
    hasUnsavedChanges: false,
    setHasUnsavedChanges: jest.fn(),
    hasUnappliedChanges: false,
    openInspector: jest.fn(),
    setOriginatingApp: jest.fn(),
    stateContainer,
    visualizationIdFromUrl: undefined,
    stateTransfer: {
      ...createEmbeddableStateTransferMock(),
      getAppNameFromId: jest.fn((appId: string) => appId),
    },
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
    const novisSaveServices = {
      ...services,
      visualizeCapabilities: {
        save: false,
      },
    };
    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: 'dashboards',
        visInstance: vis,
      } as unknown as TopNavConfigParams,
      novisSaveServices as unknown as VisualizeServices
    );

    expect(getMenuItemIds(result)).toEqual(['inspector', 'cancel']);
    expect(result.menu.primaryActionItem?.id).toBe('saveAndReturn');
    expect(result.menu.primaryActionItem?.testId).toBe('visualizesaveAndReturnButton');
    expect(result.share?.isDisabled).toBe(false);
    expect(result.back.label).toBeDefined();
  });
  test('returns correct links that include when export integrations are available', () => {
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

    const availableExportIntegrationsSpy = jest.spyOn(share, 'availableIntegrations');

    availableExportIntegrationsSpy.mockImplementationOnce((_objectType, groupId) => {
      if (groupId === 'export') {
        return [
          {
            id: 'export',
            shareType: 'integration',
            groupId: 'export',
            config: () => ({}),
          },
        ];
      }

      return [];
    });

    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: 'dashboards',
        visInstance: vis,
      } as unknown as TopNavConfigParams,
      services
    );

    expect(getMenuItemIds(result)).toContain('export');

    // revert mock implementation
    availableExportIntegrationsSpy.mockRestore();
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
    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: undefined,
        visInstance: vis,
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(getMenuItemIds(result)).toEqual(['inspector']);
    expect(result.menu.primaryActionItem?.id).toBe('save');
    expect(result.menu.primaryActionItem?.testId).toBe('visualizeSaveButton');
    expect(result.share?.isDisabled).toBe(false);
    expect(result.back.label).toBe('Visualize library');
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
    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: 'testApp',
        originatingPath: '/testPath',
        visInstance: vis,
      } as unknown as TopNavConfigParams,
      {
        ...services,
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(() => '/app/testApp/testPath'),
        },
      } as unknown as VisualizeServices
    );

    const executionFunction = result.menu.items?.find(({ id }) => id === 'cancel')?.run;
    await executionFunction?.();
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
    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: 'dashboards',
        visInstance: vis,
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(getMenuItemIds(result)).toEqual(['inspector', 'cancel', 'save']);
    expect(result.menu.items?.find(({ id }) => id === 'save')?.label).toBe('Save as');
    expect(result.menu.primaryActionItem?.id).toBe('saveAndReturn');
    expect(result.share?.isDisabled).toBe(false);
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
    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: 'dashboards',
        visInstance: vis,
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(getMenuItemIds(result)).toEqual(['inspector', 'cancel', 'save']);
    expect(result.menu.items?.find(({ id }) => id === 'save')?.label).toBe('Save to library');
    expect(result.menu.primaryActionItem?.id).toBe('saveAndReturn');
    expect(result.share?.isDisabled).toBe(true);
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
    const result = getTopNavConfig(
      {
        ...defaultParams,
        originatingApp: 'dashboards',
        visInstance: vis,
        displayEditInLensItem: true,
        hideLensBadge: false,
      } as unknown as TopNavConfigParams,
      services as unknown as VisualizeServices
    );

    expect(getMenuItemIds(result)).toEqual(['goToLens', 'inspector', 'cancel', 'save']);
    expect(result.menu.items?.find(({ id }) => id === 'goToLens')?.testId).toBe(
      'visualizeEditInLensButton'
    );
    expect(result.menu.primaryActionItem?.id).toBe('saveAndReturn');
  });
});
