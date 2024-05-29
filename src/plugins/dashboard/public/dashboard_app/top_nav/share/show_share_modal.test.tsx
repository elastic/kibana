/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core/public';
import { DashboardLocatorParams } from '../../../dashboard_container';
import { convertPanelMapToSavedPanels, DashboardContainerInput } from '../../../../common';

import { pluginServices } from '../../../services/plugin_services';
import { showPublicUrlSwitch, ShowShareModal, ShowShareModalProps } from './show_share_modal';

describe('showPublicUrlSwitch', () => {
  test('returns false if "dashboard" app is not available', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns false if "dashboard" app is not accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      dashboard: {
        show: false,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(false);
  });

  test('returns true if "dashboard" app is not available an accessible', () => {
    const anonymousUserCapabilities: Capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      dashboard: {
        show: true,
      },
    };
    const result = showPublicUrlSwitch(anonymousUserCapabilities);

    expect(result).toBe(true);
  });
});

describe('ShowShareModal', () => {
  const unsavedStateKeys = ['query', 'filters', 'options', 'savedQuery', 'panels'] as Array<
    keyof DashboardLocatorParams
  >;
  const toggleShareMenuSpy = jest.spyOn(
    pluginServices.getServices().share,
    'toggleShareContextMenu'
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  const getPropsAndShare = (
    unsavedState?: Partial<DashboardContainerInput>
  ): ShowShareModalProps => {
    pluginServices.getServices().dashboardBackup.getState = jest
      .fn()
      .mockReturnValue({ dashboardState: unsavedState });
    return {
      isDirty: true,
      anchorElement: document.createElement('div'),
      getDashboardState: () => ({} as DashboardContainerInput),
    };
  };

  it('locatorParams is missing all unsaved state when none is given', () => {
    const showModalProps = getPropsAndShare();
    ShowShareModal(showModalProps);
    expect(toggleShareMenuSpy).toHaveBeenCalledTimes(1);
    const shareLocatorParams = (
      toggleShareMenuSpy.mock.calls[0][0].sharingData as {
        locatorParams: { params: DashboardLocatorParams };
      }
    ).locatorParams.params;
    unsavedStateKeys.forEach((key) => {
      expect(shareLocatorParams[key]).toBeUndefined();
    });
  });

  it('locatorParams unsaved state is properly propagated to locator', () => {
    const unsavedDashboardState: DashboardContainerInput = {
      panels: {
        panel_1: {
          type: 'panel_type',
          gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
          panelRefName: 'superPanel',
          explicitInput: {
            id: 'superPanel',
          },
        },
      },
      hidePanelTitles: true,
      useMargins: true,
      syncColors: true,
      syncCursor: true,
      syncTooltips: true,
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
        },
      ],
      query: { query: 'bye', language: 'kuery' },
    } as unknown as DashboardContainerInput;
    const showModalProps = getPropsAndShare(unsavedDashboardState);
    ShowShareModal(showModalProps);
    expect(toggleShareMenuSpy).toHaveBeenCalledTimes(1);
    const shareLocatorParams = (
      toggleShareMenuSpy.mock.calls[0][0].sharingData as {
        locatorParams: { params: DashboardLocatorParams };
      }
    ).locatorParams.params;
    const rawDashboardState = {
      ...unsavedDashboardState,
      panels: convertPanelMapToSavedPanels(unsavedDashboardState.panels),
    };
    unsavedStateKeys.forEach((key) => {
      expect(shareLocatorParams[key]).toStrictEqual(
        (rawDashboardState as unknown as Partial<DashboardLocatorParams>)[key]
      );
    });
  });

  it('applies unsaved panel state from backup service into the locator params', () => {
    const unsavedDashboardState = {
      panels: {
        panel_1: {
          gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
          type: 'superType',
          explicitInput: {
            id: 'whatever',
            changedKey1: 'not changed....',
          },
        },
      },
    };
    const props = getPropsAndShare(unsavedDashboardState);
    const getCurrentState: () => DashboardContainerInput = () => {
      return {
        panels: {
          panel_1: {
            gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
            type: 'superType',
            explicitInput: {
              id: 'whatever',
              changedKey1: 'NOT changed',
            },
          },
          panel_2: {
            gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
            type: 'superType',
            explicitInput: {
              id: 'whatever2',
              changedKey2: 'definitely NOT changed',
            },
          },
        },
      } as unknown as DashboardContainerInput;
    };
    pluginServices.getServices().dashboardBackup.getState = jest.fn().mockReturnValue({
      dashboardState: unsavedDashboardState,
      panels: {
        panel_1: { changedKey1: 'changed' },
        panel_2: { changedKey2: 'definitely changed' },
      },
    });
    props.getDashboardState = getCurrentState;
    ShowShareModal(props);
    expect(toggleShareMenuSpy).toHaveBeenCalledTimes(1);
    const shareLocatorParams = (
      toggleShareMenuSpy.mock.calls[0][0].sharingData as {
        locatorParams: { params: DashboardLocatorParams };
      }
    ).locatorParams.params;

    expect(shareLocatorParams.panels).toBeDefined();
    expect(shareLocatorParams.panels![0].embeddableConfig.changedKey1).toBe('changed');
    expect(shareLocatorParams.panels![1].embeddableConfig.changedKey2).toBe('definitely changed');
  });
});
