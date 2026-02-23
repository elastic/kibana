/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY } from '../../../../../common/constants';
import { useSwitchModesTour } from './use_switch_modes_tour';

const flushRaf = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

describe('useSwitchModesTour', () => {
  const setup = async ({
    enableEsql = true,
    dismissed = false,
  }: { enableEsql?: boolean; dismissed?: boolean } = {}) => {
    const toolkit = getDiscoverInternalStateMock();
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    if (dismissed) {
      toolkit.services.storage.set(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY, true);
    }

    const uiSettingsGetSpy = jest.spyOn(toolkit.services.uiSettings, 'get');
    const originalGet = uiSettingsGetSpy.getMockImplementation();
    uiSettingsGetSpy.mockImplementation((key: string) => {
      if (key === ENABLE_ESQL) return enableEsql;
      return originalGet?.(key);
    });

    const hook = renderHook(() => useSwitchModesTour(), {
      wrapper: ({ children }) => (
        <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
      ),
    });

    return { toolkit, hook };
  };

  it('returns null when callout was previously dismissed', async () => {
    const { hook } = await setup({ dismissed: true });
    await act(async () => {
      await flushRaf();
    });
    expect(hook.result.current).toBeNull();
  });

  it('returns null when ES|QL is disabled', async () => {
    const { hook } = await setup({ enableEsql: false });
    await act(async () => {
      await flushRaf();
    });
    expect(hook.result.current).toBeNull();
  });

  it('returns tour step when conditions are met', async () => {
    const { hook } = await setup();
    await act(async () => {
      await flushRaf();
    });
    expect(hook.result.current).not.toBeNull();
    expect(React.isValidElement(hook.result.current)).toBe(true);
  });
});
