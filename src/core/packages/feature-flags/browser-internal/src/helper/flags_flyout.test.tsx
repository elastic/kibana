/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { HttpSetup } from '@kbn/core-http-browser';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FlagsFlyout } from './flags_flyout';

function createHttp(): jest.Mocked<Pick<HttpSetup, 'get' | 'post' | 'put' | 'delete'>> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
}

function renderFlyout(
  http: ReturnType<typeof createHttp>,
  refreshFlags = jest.fn().mockResolvedValue(undefined),
  getBrowserEvaluations: () => Array<{ key: string; value: unknown }> = () => []
) {
  renderWithI18n(
    <FlagsFlyout
      http={http}
      refreshFlags={refreshFlags}
      getBrowserEvaluations={getBrowserEvaluations}
      onClose={jest.fn()}
    />
  );
  return { refreshFlags };
}

describe('FlagsFlyout', () => {
  test('shows the snapshot together with config and runtime overrides', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'from.provider', value: true },
        { key: 'from.server', value: 'alpha' },
      ],
    });
    http.get.mockResolvedValue({
      runtimeOverrides: { 'from.provider': false },
      configOverrides: { 'from.config': 2 },
    });

    renderFlyout(http);

    expect(await screen.findByText('from.provider')).toBeInTheDocument();
    expect(screen.getByText('from.server')).toBeInTheDocument();
    expect(screen.getByText('from.config')).toBeInTheDocument();
    expect(screen.getByText('Runtime override')).toBeInTheDocument();
    expect(screen.getByText('Config override')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
  });

  test('lists evaluated flags when the provider snapshot is empty', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [] });
    http.get.mockResolvedValue({
      runtimeOverrides: {},
      configOverrides: {},
      evaluatedFlags: [{ key: 'from.server', value: false }],
    });

    renderFlyout(http, jest.fn().mockResolvedValue(undefined), () => [
      { key: 'from.browser', value: 'local' },
    ]);

    expect(await screen.findByText('from.server')).toBeInTheDocument();
    expect(screen.getByText('from.browser')).toBeInTheDocument();
    expect(screen.getAllByText('Fallback')).toHaveLength(2);
    expect(screen.getByDisplayValue('local')).toBeInTheDocument();
  });

  test('saves a boolean, number, and string override', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'bool.flag', value: false },
        { key: 'number.flag', value: 1 },
        { key: 'string.flag', value: 'old' },
      ],
    });
    http.get.mockResolvedValue({
      runtimeOverrides: {},
      configOverrides: {},
    });
    http.put.mockResolvedValue({ ok: true });
    const { refreshFlags } = renderFlyout(http);
    await screen.findByText('bool.flag');

    await userEvent.click(screen.getByTestId('featureFlagsHelperValue-bool.flag-true'));
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('featureFlagsHelperSavedCheck-bool.flag')).toBeInTheDocument();
    await screen.findByTestId('featureFlagsHelperValue-number.flag');

    const numberField = screen.getByTestId('featureFlagsHelperValue-number.flag');
    await userEvent.clear(numberField);
    await userEvent.type(numberField, '8{Enter}');
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
    await screen.findByTestId('featureFlagsHelperValue-string.flag');

    const stringField = screen.getByTestId('featureFlagsHelperValue-string.flag');
    await userEvent.clear(stringField);
    await userEvent.type(stringField, 'new{Enter}');

    expect(http.put).toHaveBeenCalledWith('/internal/feature-flags/overrides/bool.flag', {
      body: JSON.stringify({ value: true }),
    });
    expect(http.put).toHaveBeenCalledWith('/internal/feature-flags/overrides/number.flag', {
      body: JSON.stringify({ value: 8 }),
    });
    expect(http.put).toHaveBeenCalledWith('/internal/feature-flags/overrides/string.flag', {
      body: JSON.stringify({ value: 'new' }),
    });
    expect(refreshFlags).toHaveBeenCalled();
  });

  test('clicking the current boolean value creates an override only when none exists', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'plain.flag', value: false },
        { key: 'overridden.flag', value: true },
      ],
    });
    http.get.mockResolvedValue({
      runtimeOverrides: { 'overridden.flag': true },
      configOverrides: {},
    });
    http.put.mockResolvedValue({ ok: true });
    renderFlyout(http);
    await screen.findByText('plain.flag');

    await userEvent.click(screen.getByTestId('featureFlagsHelperValue-overridden.flag-true'));
    expect(http.put).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('featureFlagsHelperValue-plain.flag-false'));
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(http.put).toHaveBeenCalledWith('/internal/feature-flags/overrides/plain.flag', {
      body: JSON.stringify({ value: false }),
    });
  });

  test('pressing Enter on an unchanged input creates an override only when none exists', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'plain.flag', value: 'same' },
        { key: 'overridden.flag', value: 'kept' },
      ],
    });
    http.get.mockResolvedValue({
      runtimeOverrides: { 'overridden.flag': 'kept' },
      configOverrides: {},
    });
    http.put.mockResolvedValue({ ok: true });
    renderFlyout(http);
    const plain = await screen.findByTestId('featureFlagsHelperValue-plain.flag');
    const overridden = screen.getByTestId('featureFlagsHelperValue-overridden.flag');

    await userEvent.type(overridden, '{Enter}');
    await userEvent.click(plain);
    await userEvent.tab();
    expect(http.put).not.toHaveBeenCalled();

    await userEvent.type(plain, '{Enter}');
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(http.put).toHaveBeenCalledWith('/internal/feature-flags/overrides/plain.flag', {
      body: JSON.stringify({ value: 'same' }),
    });
  });

  test('reverts a number override to the stored value when it is emptied', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [{ key: 'number.flag', value: 3 }] });
    http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
    renderFlyout(http);
    const numberField = await screen.findByTestId('featureFlagsHelperValue-number.flag');

    await userEvent.clear(numberField);
    expect(numberField).toHaveValue(null);
    await userEvent.tab();

    await waitFor(() => expect(numberField).toHaveValue(3));
    expect(http.put).not.toHaveBeenCalled();
  });

  test('stays read-only when the overrides endpoint refuses the user', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [{ key: 'from.provider', value: true }] });
    http.get.mockRejectedValue(
      Object.assign(new Error('forbidden'), { response: { status: 403 } })
    );

    renderFlyout(http);

    expect(await screen.findByTestId('featureFlagsHelperForbidden')).toBeInTheDocument();
    expect(screen.getByText('from.provider')).toBeInTheDocument();
    expect(screen.queryByTestId('featureFlagsHelperSave-from.provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('featureFlagsHelperClearAll')).not.toBeInTheDocument();
  });

  test('shows a retryable error when runtime overrides fail to load', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [{ key: 'from.provider', value: true }] });
    http.get
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { response: { status: 500 } }))
      .mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });

    renderFlyout(http);

    expect(
      await screen.findByText('Runtime overrides could not be loaded. Refresh to try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('from.provider')).not.toBeInTheDocument();
    expect(screen.queryByText('Provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('featureFlagsHelperClearAll')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('featureFlagsHelperRefresh'));

    expect(await screen.findByText('from.provider')).toBeInTheDocument();
    expect(
      screen.queryByText('Runtime overrides could not be loaded. Refresh to try again.')
    ).not.toBeInTheDocument();
  });
});
