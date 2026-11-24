/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
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

/** The search box reacts to key presses, so `userEvent.clear` would not update the filter. */
async function emptySearchBox(search: HTMLElement) {
  await userEvent.click(search);
  await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
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

  test('filters the flags with the search box', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'alpha.flag', value: true },
        { key: 'beta.flag', value: 'x' },
      ],
    });
    http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
    renderFlyout(http);
    await screen.findByText('alpha.flag');

    await userEvent.type(screen.getByPlaceholderText('Search flags'), 'beta');

    await waitFor(() => expect(screen.queryByText('alpha.flag')).not.toBeInTheDocument());
    expect(screen.getByText('beta.flag')).toBeInTheDocument();
  });

  test('searches by field as well as by flag name', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'alpha.flag', value: true },
        { key: 'beta.flag', value: 'needle' },
        { key: 'gamma.flag', value: 7 },
      ],
    });
    http.get.mockResolvedValue({
      runtimeOverrides: { 'gamma.flag': 7 },
      configOverrides: {},
    });
    renderFlyout(http);
    await screen.findByText('alpha.flag');
    const search = screen.getByPlaceholderText('Search flags');
    const expectOnly = async (shown: string[]) => {
      await waitFor(() => {
        ['alpha.flag', 'beta.flag', 'gamma.flag'].forEach((flag) => {
          if (shown.includes(flag)) {
            expect(screen.getByText(flag)).toBeInTheDocument();
          } else {
            expect(screen.queryByText(flag)).not.toBeInTheDocument();
          }
        });
      });
    };

    await userEvent.type(search, 'type:boolean');
    await expectOnly(['alpha.flag']);

    await emptySearchBox(search);
    await userEvent.type(search, 'source:runtime');
    await expectOnly(['gamma.flag']);

    await emptySearchBox(search);
    await userEvent.type(search, 'needle');
    await expectOnly(['beta.flag']);

    // Emptying the box shows every flag again.
    await emptySearchBox(search);
    await expectOnly(['alpha.flag', 'beta.flag', 'gamma.flag']);
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

  test('ignores a stale reload that finishes after a newer one', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({
      flags: [
        { key: 'a.flag', value: false },
        { key: 'b.flag', value: false },
      ],
    });
    http.put.mockResolvedValue({ ok: true });
    let resolveStale: (value: unknown) => void = () => {};
    const stale = new Promise((resolve) => {
      resolveStale = resolve;
    });
    http.get
      .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
      // The reload after the first save is slow and will resolve last, with outdated data.
      .mockReturnValueOnce(stale as never)
      .mockResolvedValueOnce({
        runtimeOverrides: { 'a.flag': true, 'b.flag': true },
        configOverrides: {},
      });
    renderFlyout(http);
    await screen.findByText('a.flag');

    await userEvent.click(screen.getByTestId('featureFlagsHelperValue-a.flag-true'));
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByTestId('featureFlagsHelperValue-b.flag-true'));
    await waitFor(() => expect(screen.getAllByText('Runtime override')).toHaveLength(2));

    await act(async () => {
      resolveStale({ runtimeOverrides: {}, configOverrides: {} });
    });

    expect(screen.getAllByText('Runtime override')).toHaveLength(2);
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
  });

  test('restores the stored boolean selection when saving fails', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [{ key: 'bool.flag', value: false }] });
    http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
    http.put.mockRejectedValue(new Error('nope'));
    renderFlyout(http);
    await screen.findByText('bool.flag');

    await userEvent.click(screen.getByTestId('featureFlagsHelperValue-bool.flag-true'));

    expect(await screen.findByTestId('featureFlagsHelperError-bool.flag')).toBeInTheDocument();
    expect(await screen.findByText(/failed to save/)).toBeInTheDocument();
    expect(screen.getByText('bool.flag', { selector: 'code' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('featureFlagsHelperValue-bool.flag-false')).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
    expect(screen.getByTestId('featureFlagsHelperValue-bool.flag-true')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('does not submit the same edit twice when blurring after Enter', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [{ key: 'string.flag', value: 'old' }] });
    http.put.mockResolvedValue({ ok: true });
    let resolveReload: (value: unknown) => void = () => {};
    const reload = new Promise((resolve) => {
      resolveReload = resolve;
    });
    http.get
      .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
      // Hold the post-save reload so the row still shows the old stored value on blur.
      .mockReturnValueOnce(reload as never);
    renderFlyout(http);
    const field = await screen.findByTestId('featureFlagsHelperValue-string.flag');

    await userEvent.clear(field);
    await userEvent.type(field, 'new{Enter}');
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    await userEvent.tab();

    expect(http.put).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveReload({ runtimeOverrides: { 'string.flag': 'new' }, configOverrides: {} });
    });
    // A duplicate blur commit queued during the reload would be sent only after it finished.
    expect(http.put).toHaveBeenCalledTimes(1);
  });

  describe('rapid changes to one flag', () => {
    const pressed = (value: 'true' | 'false') =>
      screen.getByTestId(`featureFlagsHelperValue-a.flag-${value}`);

    function setup() {
      const http = createHttp();
      http.post.mockResolvedValue({ flags: [{ key: 'a.flag', value: false }] });
      const puts: Array<{ resolve: () => void; reject: () => void }> = [];
      http.put.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            puts.push({
              resolve: () => resolve({ ok: true }),
              reject: () => reject(new Error('x')),
            });
          }) as never
      );
      return { http, puts };
    }

    test('ignores the earlier request while a newer one is pending', async () => {
      const { http, puts } = setup();
      http.get
        .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
        .mockResolvedValueOnce({ runtimeOverrides: { 'a.flag': false }, configOverrides: {} });
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(pressed('true'));
      await userEvent.click(pressed('false'));
      expect(http.put).toHaveBeenCalledTimes(1);

      await act(async () => puts[0].resolve());
      await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
      // The first save finished, but nothing reloads and the selection stays on the newer choice.
      expect(http.get).toHaveBeenCalledTimes(1);
      expect(pressed('false')).toHaveAttribute('aria-pressed', 'true');

      await act(async () => puts[1].resolve());
      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
      expect(http.put).toHaveBeenNthCalledWith(2, '/internal/feature-flags/overrides/a.flag', {
        body: JSON.stringify({ value: false }),
      });
      expect(pressed('false')).toHaveAttribute('aria-pressed', 'true');
    });

    test('sends one request when the same option is clicked repeatedly', async () => {
      const { http, puts } = setup();
      http.get
        .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
        .mockResolvedValue({ runtimeOverrides: { 'a.flag': true }, configOverrides: {} });
      renderFlyout(http);
      await screen.findByText('a.flag');

      for (let click = 0; click < 5; click++) {
        await userEvent.click(pressed('true'));
      }
      expect(http.put).toHaveBeenCalledTimes(1);

      await act(async () => puts[0].resolve());
      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
      await userEvent.click(pressed('true'));
      expect(http.put).toHaveBeenCalledTimes(1);
    });

    test('skips a queued choice that matches what the server already accepted', async () => {
      const { http, puts } = setup();
      http.get
        .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
        .mockResolvedValue({ runtimeOverrides: { 'a.flag': true }, configOverrides: {} });
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(pressed('true'));
      await userEvent.click(pressed('false'));
      await userEvent.click(pressed('true'));
      await act(async () => puts[0].resolve());

      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
      expect(http.put).toHaveBeenCalledTimes(1);
      expect(pressed('true')).toHaveAttribute('aria-pressed', 'true');
    });

    test('reverts to the earlier accepted value when the newer request fails', async () => {
      const { http, puts } = setup();
      http.get
        .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
        .mockResolvedValueOnce({ runtimeOverrides: { 'a.flag': true }, configOverrides: {} });
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(pressed('true'));
      await userEvent.click(pressed('false'));
      await act(async () => puts[0].resolve());
      await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
      await act(async () => puts[1].reject());

      expect(await screen.findByTestId('featureFlagsHelperError-a.flag')).toBeInTheDocument();
      expect(await screen.findByText(/failed to save/)).toBeInTheDocument();
      expect(screen.getByText('a.flag', { selector: 'code' })).toBeInTheDocument();
      await waitFor(() => expect(pressed('true')).toHaveAttribute('aria-pressed', 'true'));
      expect(pressed('false')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  test('names the flag when clearing its override fails', async () => {
    const http = createHttp();
    http.post.mockResolvedValue({ flags: [{ key: 'bool.flag', value: true }] });
    http.get.mockResolvedValue({
      runtimeOverrides: { 'bool.flag': true },
      configOverrides: {},
    });
    http.delete.mockRejectedValue(new Error('nope'));
    renderFlyout(http);
    await screen.findByText('bool.flag');

    await userEvent.click(screen.getByTestId('featureFlagsHelperReset-bool.flag'));

    expect(await screen.findByTestId('featureFlagsHelperError-bool.flag')).toBeInTheDocument();
    expect(await screen.findByText(/failed to clear/)).toBeInTheDocument();
    expect(screen.getByText('bool.flag', { selector: 'code' })).toBeInTheDocument();
  });

  describe('failed change indicator', () => {
    function setup() {
      const http = createHttp();
      http.post.mockResolvedValue({ flags: [{ key: 'a.flag', value: false }] });
      http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
      http.put.mockRejectedValueOnce(new Error('nope')).mockResolvedValue({ ok: true });
      return http;
    }

    test('stays after a failure and clears when the flag changes again', async () => {
      const http = setup();
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(screen.getByTestId('featureFlagsHelperValue-a.flag-true'));
      expect(await screen.findByTestId('featureFlagsHelperError-a.flag')).toBeInTheDocument();
      expect(screen.queryByTestId('featureFlagsHelperSavedCheck-a.flag')).not.toBeInTheDocument();
      // The top banner shows the same failure, and hovering the icon shows it in a tooltip too.
      expect(await screen.findByText(/failed to save/)).toBeInTheDocument();
      await userEvent.hover(screen.getByTestId('featureFlagsHelperError-a.flag'));
      // The tooltip drops the flag name, since the row already shows which flag it is.
      expect(await screen.findByText('Override failed to save.')).toBeInTheDocument();
      expect(screen.getAllByText(/failed to save/)).toHaveLength(2);

      await userEvent.click(screen.getByTestId('featureFlagsHelperValue-a.flag-true'));
      await waitFor(() =>
        expect(screen.queryByTestId('featureFlagsHelperError-a.flag')).not.toBeInTheDocument()
      );
      expect(screen.queryByText(/failed to save/)).not.toBeInTheDocument();
    });

    test('clears on refresh', async () => {
      const http = setup();
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(screen.getByTestId('featureFlagsHelperValue-a.flag-true'));
      expect(await screen.findByTestId('featureFlagsHelperError-a.flag')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('featureFlagsHelperRefresh'));
      await waitFor(() =>
        expect(screen.queryByTestId('featureFlagsHelperError-a.flag')).not.toBeInTheDocument()
      );
    });
  });

  describe('pending override source', () => {
    function setup() {
      const http = createHttp();
      http.post.mockResolvedValue({ flags: [{ key: 'a.flag', value: false }] });
      http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
      let settle: { resolve: () => void; reject: () => void } = {
        resolve: () => {},
        reject: () => {},
      };
      http.put.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            settle = { resolve: () => resolve({ ok: true }), reject: () => reject(new Error('x')) };
          }) as never
      );
      return { http, getSettle: () => settle };
    }

    test('shows a runtime override while the request is pending', async () => {
      const { http } = setup();
      renderFlyout(http);
      await screen.findByText('Provider');

      await userEvent.click(screen.getByTestId('featureFlagsHelperValue-a.flag-true'));

      expect(screen.getByText('Runtime override')).toBeInTheDocument();
      expect(screen.queryByText('Provider')).not.toBeInTheDocument();
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    test('goes back to the previous source when the request fails', async () => {
      const { http, getSettle } = setup();
      renderFlyout(http);
      await screen.findByText('Provider');

      await userEvent.click(screen.getByTestId('featureFlagsHelperValue-a.flag-true'));
      expect(screen.getByText('Runtime override')).toBeInTheDocument();
      await act(async () => getSettle().reject());

      expect(await screen.findByText('Provider')).toBeInTheDocument();
      expect(screen.queryByText('Runtime override')).not.toBeInTheDocument();
    });
  });

  describe('saves are tracked per flag, outside the row', () => {
    function setup(flags: Array<{ key: string; value: unknown }>) {
      const http = createHttp();
      http.post.mockResolvedValue({ flags });
      http.delete.mockResolvedValue({ ok: true });
      const puts: Array<{ resolve: () => void }> = [];
      http.put.mockImplementation(
        () =>
          new Promise((resolve) => {
            puts.push({ resolve: () => resolve({ ok: true }) });
          }) as never
      );
      return { http, puts };
    }
    const option = (value: 'true' | 'false') =>
      screen.getByTestId(`featureFlagsHelperValue-a.flag-${value}`);

    test('a row that is filtered out and back keeps using the same queue', async () => {
      const { http, puts } = setup([{ key: 'a.flag', value: false }]);
      http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(option('true'));
      const search = screen.getByPlaceholderText('Search flags');
      await userEvent.type(search, 'zzz');
      await waitFor(() => expect(screen.queryByText('a.flag')).not.toBeInTheDocument());
      await emptySearchBox(search);
      await screen.findByText('a.flag');

      // The new editor starts from the choice being saved and queues behind the request in flight.
      expect(option('true')).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(option('false'));
      expect(http.put).toHaveBeenCalledTimes(1);

      await act(async () => puts[0].resolve());
      await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
      expect(http.put).toHaveBeenLastCalledWith('/internal/feature-flags/overrides/a.flag', {
        body: JSON.stringify({ value: false }),
      });
      await act(async () => puts[1].resolve());
    });

    test('Clear all waits for a save in flight and drops queued choices', async () => {
      const { http, puts } = setup([{ key: 'a.flag', value: false }]);
      http.get.mockResolvedValue({ runtimeOverrides: {}, configOverrides: {} });
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(option('true'));
      await userEvent.click(option('false'));
      await userEvent.click(screen.getByTestId('featureFlagsHelperClearAll'));
      expect(http.delete).not.toHaveBeenCalled();

      await act(async () => puts[0].resolve());
      await waitFor(() => expect(http.delete).toHaveBeenCalledTimes(1));
      // The queued `false` must not be written after the DELETE.
      expect(http.put).toHaveBeenCalledTimes(1);
    });

    test('clearing one flag waits for its save and drops queued choices', async () => {
      const { http, puts } = setup([{ key: 'a.flag', value: true }]);
      http.get.mockResolvedValue({
        runtimeOverrides: { 'a.flag': true },
        configOverrides: {},
      });
      renderFlyout(http);
      await screen.findByText('a.flag');

      await userEvent.click(option('false'));
      await userEvent.click(option('true'));
      await userEvent.click(screen.getByTestId('featureFlagsHelperReset-a.flag'));
      expect(http.delete).not.toHaveBeenCalled();

      await act(async () => puts[0].resolve());
      await waitFor(() => expect(http.delete).toHaveBeenCalledTimes(1));
      expect(http.put).toHaveBeenCalledTimes(1);
    });

    test('a reload from an earlier save does not replace a newer edit', async () => {
      const http = createHttp();
      http.post.mockResolvedValue({ flags: [{ key: 'string.flag', value: 'old' }] });
      http.put.mockResolvedValue({ ok: true });
      let resolveReload: (value: unknown) => void = () => {};
      const reload = new Promise((resolve) => {
        resolveReload = resolve;
      });
      http.get
        .mockResolvedValueOnce({ runtimeOverrides: {}, configOverrides: {} })
        // The reload after the first save is held while the user keeps typing.
        .mockReturnValueOnce(reload as never)
        .mockResolvedValue({ runtimeOverrides: { 'string.flag': 'ab' }, configOverrides: {} });
      renderFlyout(http);
      const field = await screen.findByTestId('featureFlagsHelperValue-string.flag');

      await userEvent.clear(field);
      await userEvent.type(field, 'a{Enter}');
      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
      await userEvent.type(field, 'b{Enter}');
      expect(field).toHaveValue('ab');

      await act(async () => {
        resolveReload({ runtimeOverrides: { 'string.flag': 'a' }, configOverrides: {} });
      });
      // The stale reload would put the older value back, and blurring would then save it.
      expect(field).toHaveValue('ab');
      await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
      await userEvent.tab();

      expect(http.put).toHaveBeenCalledTimes(2);
      expect(http.put).toHaveBeenLastCalledWith('/internal/feature-flags/overrides/string.flag', {
        body: JSON.stringify({ value: 'ab' }),
      });
    });
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
