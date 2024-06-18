/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfilesProvider } from '@kbn/content-management-user-profiles';
import { I18nProvider } from '@kbn/i18n-react';

import { ActivityView as ActivityViewComponent, ActivityViewProps } from './activity_view';

const mockGetUserProfile = jest.fn(async (uid: string) => ({
  uid,
  enabled: true,
  data: {},
  user: { username: uid, full_name: uid.toLocaleUpperCase() },
}));

const ActivityView = (props: ActivityViewProps) => {
  return (
    <I18nProvider>
      <UserProfilesProvider bulkGetUserProfiles={jest.fn()} getUserProfile={mockGetUserProfile}>
        <ActivityViewComponent {...props} />
      </UserProfilesProvider>
    </I18nProvider>
  );
};

test('should render activity view', () => {
  render(<ActivityView item={{}} />);

  expect(screen.getByTestId('activityView')).toBeVisible();

  expect(screen.getByTestId('createdByCard')).toHaveTextContent(/Unknown/);
  expect(() => screen.getByTestId('updateByCard')).toThrow();
});

test('should render creator card', async () => {
  render(<ActivityView item={{ createdBy: 'john', createdAt: '2024-06-13T12:55:46.825Z' }} />);

  await waitFor(() => {
    const createdByCard = screen.getByTestId('createdByCard');
    expect(createdByCard).toHaveTextContent(/JOHN/);
    expect(createdByCard).toHaveTextContent(/June 13/);
  });
});

test('should not render updater card when updatedAt matches createdAt', async () => {
  render(
    <ActivityView
      item={{
        createdBy: 'john',
        updatedBy: 'john',
        createdAt: '2024-06-13T12:55:46.825Z',
        updatedAt: '2024-06-13T12:55:46.825Z',
      }}
    />
  );

  expect(screen.getByTestId('createdByCard')).toBeVisible();
  expect(() => screen.getByTestId('updateByCard')).toThrow();
});

test('should render updater card', async () => {
  render(
    <ActivityView
      item={{
        createdBy: 'john',
        updatedBy: 'pete',
        createdAt: '2024-06-13T12:55:46.825Z',
        updatedAt: '2024-06-14T12:55:46.825Z',
      }}
    />
  );

  await waitFor(() => {
    const createdByCard = screen.getByTestId('createdByCard');
    expect(createdByCard).toHaveTextContent(/JOHN/);
    expect(createdByCard).toHaveTextContent(/June 13/);
  });

  await waitFor(() => {
    const updatedByCard = screen.getByTestId('updatedByCard');
    expect(updatedByCard).toHaveTextContent(/PETE/);
    expect(updatedByCard).toHaveTextContent(/June 14/);
  });
});

test('should handle managed objects', async () => {
  render(
    <ActivityView
      item={{
        managed: true,
        createdAt: '2024-06-13T12:55:46.825Z',
        updatedAt: '2024-06-14T12:55:46.825Z',
      }}
    />
  );

  await waitFor(() => {
    const createdByCard = screen.getByTestId('createdByCard');
    expect(createdByCard).toHaveTextContent(/System/);
    expect(createdByCard).toHaveTextContent(/June 13/);
  });

  const updatedByCard = screen.getByTestId('updatedByCard');
  expect(updatedByCard).toHaveTextContent(/System/);
  expect(updatedByCard).toHaveTextContent(/June 14/);
});
