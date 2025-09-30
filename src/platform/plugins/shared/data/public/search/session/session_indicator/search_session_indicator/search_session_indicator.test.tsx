/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEventDep from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { SearchSessionIndicator } from './search_session_indicator';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SearchSessionState } from '../../../..';

function setup(props: Partial<React.ComponentProps<typeof SearchSessionIndicator>> = {}) {
  const user = userEventDep.setup();
  const onCancel = jest.fn();
  const onSaveResults = jest.fn();

  render(
    <IntlProvider locale="en">
      <SearchSessionIndicator
        state={SearchSessionState.Loading}
        onCancel={onCancel}
        onSaveResults={onSaveResults}
        {...props}
      />
    </IntlProvider>
  );

  return { userEvent: user, onCancel, onSaveResults };
}

describe('<SearchSessionIndicator />', () => {
  test('Loading state', async () => {
    const { onCancel, userEvent } = setup();

    await userEvent.click(screen.getByLabelText('Background search loading'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByText('Stop session'));

    expect(onCancel).toHaveBeenCalled();
  });

  test('Completed state', async () => {
    const { onSaveResults, userEvent } = setup({ state: SearchSessionState.Completed });

    await userEvent.click(screen.getByLabelText('Background search complete'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByText('Save session'));

    expect(onSaveResults).toHaveBeenCalled();
  });

  test('Loading in the background state', async () => {
    const { onCancel, userEvent } = setup({ state: SearchSessionState.BackgroundLoading });

    await userEvent.click(screen.getByLabelText(/Background search in progress/));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByText('Stop session'));

    expect(onCancel).toHaveBeenCalled();
  });

  test('BackgroundCompleted state', async () => {
    const { userEvent } = setup({
      state: SearchSessionState.BackgroundCompleted,
      viewSearchSessionsLink: '__link__',
    });

    await userEvent.click(screen.getByLabelText(/Background search complete/));
    expect(screen.getByRole('link', { name: 'Manage sessions' }).getAttribute('href')).toBe(
      '__link__'
    );
  });

  test('Restored state', async () => {
    const { userEvent } = setup({
      state: SearchSessionState.Restored,
      viewSearchSessionsLink: '__link__',
    });

    await userEvent.click(screen.getByLabelText(/Background search restored/));

    expect(screen.getByRole('link', { name: 'Manage sessions' }).getAttribute('href')).toBe(
      '__link__'
    );
  });

  test('Canceled state', async () => {
    const { userEvent } = setup({
      state: SearchSessionState.Canceled,
      viewSearchSessionsLink: '__link__',
    });

    await userEvent.click(screen.getByLabelText(/Background search stopped/));
    expect(screen.getByRole('link', { name: 'Manage sessions' }).getAttribute('href')).toBe(
      '__link__'
    );
  });

  describe('when saveDisabled is true', () => {
    const saveDisabled = true;

    describe.each([
      { state: SearchSessionState.Loading, text: 'Background search loading' },
      { state: SearchSessionState.Completed, text: 'Background search complete' },
    ])('when the state is $state', ({ state, text }) => {
      it('the button should be disabled', async () => {
        const { userEvent } = setup({ state, saveDisabled });
        await userEvent.click(screen.getByLabelText(text));
        expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();
      });
    });
  });
});
