/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY } from '../../../../../common/constants';
import { internalStateActions } from '../../state_management/redux';
import { TabsBarVisibility } from '../../state_management/redux/types';
import { useSwitchModesTour } from './use_switch_modes_tour';

describe('useSwitchModesTour', () => {
  const setup = async ({
    enableEsql = true,
    dismissed = false,
    toursEnabled = true,
    hideTabsBar = false,
  }: {
    enableEsql?: boolean;
    dismissed?: boolean;
    toursEnabled?: boolean;
    hideTabsBar?: boolean;
  } = {}) => {
    const toolkit = getDiscoverInternalStateMock();
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    if (dismissed) {
      toolkit.services.storage.set(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY, true);
    }

    if (!toursEnabled) {
      jest.spyOn(toolkit.services.notifications.tours, 'isEnabled').mockReturnValue(false);
    }

    if (hideTabsBar) {
      toolkit.internalState.dispatch(
        internalStateActions.setTabsBarVisibility(TabsBarVisibility.hidden)
      );
    }

    const uiSettingsGetSpy = jest.spyOn(toolkit.services.uiSettings, 'get');
    const originalGet = uiSettingsGetSpy.getMockImplementation();
    uiSettingsGetSpy.mockImplementation((key: string) => {
      if (key === ENABLE_ESQL) return enableEsql;
      return originalGet?.(key);
    });

    const SwitchModesTourHarness = () => {
      const tourStep = useSwitchModesTour();
      return (
        <>
          <span data-test-subj={`unifiedTabs_tabMenuBtn_${toolkit.getCurrentTab().id}`} />
          {tourStep ?? <span data-test-subj="tour-fallback" />}
        </>
      );
    };

    const result = renderWithI18n(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <SwitchModesTourHarness />
      </DiscoverToolkitTestProvider>
    );

    return { toolkit, result };
  };

  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(async () => {
    // EuiTourStep can leave leftovers if it's left open, so ensure it's closed after each test
    if (screen.queryByTestId('discoverTabMenuSwitchModesTourClose')) {
      await user.click(screen.getByTestId('discoverTabMenuSwitchModesTourClose'));
    }
  });

  it('returns null when callout was previously dismissed', async () => {
    await setup({ dismissed: true });
    expect(screen.queryByTestId('tour-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverTabMenuSwitchModesCallout')).not.toBeInTheDocument();
  });

  it('returns null when ES|QL is disabled', async () => {
    await setup({ enableEsql: false });
    expect(screen.queryByTestId('tour-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverTabMenuSwitchModesCallout')).not.toBeInTheDocument();
  });

  it('returns null when tours are disabled', async () => {
    await setup({ toursEnabled: false });
    expect(screen.queryByTestId('tour-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverTabMenuSwitchModesCallout')).not.toBeInTheDocument();
  });

  it('returns null when tabs bar is hidden', async () => {
    await setup({ hideTabsBar: true });
    expect(screen.queryByTestId('tour-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverTabMenuSwitchModesCallout')).not.toBeInTheDocument();
  });

  it('returns tour step when conditions are met', async () => {
    await setup();
    expect(screen.queryByTestId('tour-fallback')).not.toBeInTheDocument();
    expect(await screen.findByTestId('discoverTabMenuSwitchModesCallout')).toBeInTheDocument();
  });

  it('persists dismissal when tour is closed', async () => {
    const { toolkit } = await setup();

    expect(toolkit.services.storage.get(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY)).toBeNull();

    await user.click(await screen.findByTestId('discoverTabMenuSwitchModesTourClose'));

    expect(toolkit.services.storage.get(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY)).toBe('true');
    expect(screen.queryByTestId('tour-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverTabMenuSwitchModesCallout')).not.toBeInTheDocument();
  });
});
