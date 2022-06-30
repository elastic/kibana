/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardState } from '../../types';
import { DashboardAppLocatorParams } from '../..';
import { Capabilities } from '../../services/core';
import { SharePluginStart } from '../../services/share';
import { stateToRawDashboardState } from '../lib/convert_dashboard_state';
import { getSavedDashboardMock, makeDefaultServices } from '../test_helpers';
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
    keyof DashboardAppLocatorParams
  >;

  const getPropsAndShare = (
    unsavedState?: Partial<DashboardState>
  ): { share: SharePluginStart; showModalProps: ShowShareModalProps } => {
    const services = makeDefaultServices();
    const share = {} as unknown as SharePluginStart;
    share.toggleShareContextMenu = jest.fn();
    services.dashboardSessionStorage.getState = jest.fn().mockReturnValue(unsavedState);
    return {
      showModalProps: {
        share,
        isDirty: true,
        kibanaVersion: 'testKibanaVersion',
        savedDashboard: getSavedDashboardMock(),
        anchorElement: document.createElement('div'),
        dashboardCapabilities: services.dashboardCapabilities,
        currentDashboardState: { panels: {} } as unknown as DashboardState,
        dashboardSessionStorage: services.dashboardSessionStorage,
        timeRange: {
          from: '2021-10-07T00:00:00.000Z',
          to: '2021-10-10T00:00:00.000Z',
        },
      },
      share,
    };
  };

  it('locatorParams is missing all unsaved state when none is given', () => {
    const { share, showModalProps } = getPropsAndShare();
    const toggleShareMenuSpy = jest.spyOn(share, 'toggleShareContextMenu');
    ShowShareModal(showModalProps);
    expect(share.toggleShareContextMenu).toHaveBeenCalledTimes(1);
    const shareLocatorParams = (
      toggleShareMenuSpy.mock.calls[0][0].sharingData as {
        locatorParams: { params: DashboardAppLocatorParams };
      }
    ).locatorParams.params;
    unsavedStateKeys.forEach((key) => {
      expect(shareLocatorParams[key]).toBeUndefined();
    });
  });

  it('locatorParams unsaved state is properly propagated to locator', () => {
    const unsavedDashboardState: DashboardState = {
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
      options: {
        hidePanelTitles: true,
        useMargins: true,
        syncColors: true,
        syncTooltips: true,
      },
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
      savedQuery: 'amazingSavedQuery',
    } as unknown as DashboardState;
    const { share, showModalProps } = getPropsAndShare(unsavedDashboardState);
    const toggleShareMenuSpy = jest.spyOn(share, 'toggleShareContextMenu');
    ShowShareModal(showModalProps);
    expect(share.toggleShareContextMenu).toHaveBeenCalledTimes(1);
    const shareLocatorParams = (
      toggleShareMenuSpy.mock.calls[0][0].sharingData as {
        locatorParams: { params: DashboardAppLocatorParams };
      }
    ).locatorParams.params;
    const rawDashboardState = stateToRawDashboardState({
      state: unsavedDashboardState,
      version: 'testKibanaVersion',
    });
    unsavedStateKeys.forEach((key) => {
      expect(shareLocatorParams[key]).toStrictEqual(
        (rawDashboardState as Partial<DashboardAppLocatorParams>)[key]
      );
    });
  });
});
