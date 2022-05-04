/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchSessionIndicator } from './search_session_indicator';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SearchSessionState } from '../../../..';

function Container({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

test('Loading state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Loading} onCancel={onCancel} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Search session loading'));
  await userEvent.click(screen.getByText('Stop session'));

  expect(onCancel).toBeCalled();
});

test('Completed state', async () => {
  const onSave = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Completed} onSaveResults={onSave} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Search session complete'));
  await userEvent.click(screen.getByText('Save session'));

  expect(onSave).toBeCalled();
});

test('Loading in the background state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.BackgroundLoading} onCancel={onCancel} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText(/Saved session in progress/));
  await userEvent.click(screen.getByText('Stop session'));

  expect(onCancel).toBeCalled();
});

test('BackgroundCompleted state', async () => {
  render(
    <Container>
      <SearchSessionIndicator
        state={SearchSessionState.BackgroundCompleted}
        viewSearchSessionsLink={'__link__'}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText(/Saved session complete/));
  expect(screen.getByRole('link', { name: 'Manage sessions' }).getAttribute('href')).toBe(
    '__link__'
  );
});

test('Restored state', async () => {
  render(
    <Container>
      <SearchSessionIndicator
        state={SearchSessionState.Restored}
        viewSearchSessionsLink={'__link__'}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText(/Saved session restored/));

  expect(screen.getByRole('link', { name: 'Manage sessions' }).getAttribute('href')).toBe(
    '__link__'
  );
});

test('Canceled state', async () => {
  render(
    <Container>
      <SearchSessionIndicator
        state={SearchSessionState.Canceled}
        viewSearchSessionsLink={'__link__'}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText(/Search session stopped/));
  expect(screen.getByRole('link', { name: 'Manage sessions' }).getAttribute('href')).toBe(
    '__link__'
  );
});

test('Disabled state', async () => {
  const { rerender } = render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Loading} saveDisabled={true} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Search session loading'));

  expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();

  rerender(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Completed} saveDisabled={true} />
    </Container>
  );

  expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();
});
