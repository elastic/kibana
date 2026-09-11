/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AccessControlForm } from './access_control_form';

const value = {
  access_mode: 'private' as const,
  entries: [{ type: 'user' as const, id: 'reader', role: 'viewer' as const }],
};
const roles = [
  { value: 'viewer', text: 'Viewer' },
  { value: 'editor', text: 'Editor' },
] as const;
const renderForm = (
  isDisabled = false,
  accessMode: 'public' | 'private' = 'private',
  allowPublicEntries = true
) => {
  const onChange = jest.fn();
  render(
    <EuiProvider>
      <AccessControlForm
        value={{ ...value, access_mode: accessMode }}
        onChange={onChange}
        ownerId="owner"
        profiles={[]}
        suggestedProfiles={[]}
        onSearch={jest.fn()}
        roles={roles}
        publicDescription="Visible in this space"
        isDisabled={isDisabled}
        allowPublicEntries={allowPublicEntries}
      />
    </EuiProvider>
  );
  return onChange;
};

describe('AccessControlForm', () => {
  it('hides user restrictions for public workflows without losing private entries', async () => {
    const onChange = renderForm(false, 'public', false);
    expect(screen.queryByLabelText('Find users')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Role for reader')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Visibility'));
    await userEvent.click(screen.getByRole('option', { name: /^Private/ }));
    expect(onChange).toHaveBeenCalledWith(value);
  });

  it('changes visibility without losing role assignments', async () => {
    const onChange = renderForm();
    await userEvent.click(screen.getByLabelText('Visibility'));
    await userEvent.click(screen.getByRole('option', { name: /^Public/ }));
    expect(onChange).toHaveBeenCalledWith({ ...value, access_mode: 'public' });
  });
  it('changes an existing user role by profile ID', async () => {
    const onChange = renderForm();
    await userEvent.click(screen.getByLabelText('Role for reader'));
    await userEvent.click(screen.getByRole('option', { name: 'Editor' }));
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      entries: [{ ...value.entries[0], role: 'editor' }],
    });
  });
  it('lets the owner remove an entry even if its profile is unavailable', () => {
    const onChange = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Remove reader' }));
    expect(onChange).toHaveBeenCalledWith({ ...value, entries: [] });
    expect(screen.queryByRole('button', { name: 'Remove owner' })).not.toBeInTheDocument();
  });
  it('excludes the current user from suggestions even without a stored owner', async () => {
    render(
      <EuiProvider>
        <AccessControlForm
          value={{ access_mode: 'private', entries: [] }}
          onChange={jest.fn()}
          currentUserId="current"
          profiles={[]}
          onSearch={jest.fn()}
          roles={roles}
          suggestedProfiles={[
            { uid: 'current', enabled: true, user: { username: 'elastic' }, data: {} },
            { uid: 'other', enabled: true, user: { username: 'other' }, data: {} },
          ]}
          publicDescription="Visible in this space"
        />
      </EuiProvider>
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Find users' }));
    expect(screen.queryByRole('option', { name: /elastic/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /other/ })).toBeInTheDocument();
  });

  it('labels the current owner separately from editable entries', () => {
    render(
      <EuiProvider>
        <AccessControlForm
          value={{ access_mode: 'private', entries: [] }}
          onChange={jest.fn()}
          ownerId="current"
          currentUserId="current"
          profiles={[]}
          suggestedProfiles={[]}
          onSearch={jest.fn()}
          roles={roles}
          publicDescription="Visible in this space"
        />
      </EuiProvider>
    );
    expect(screen.getByText('Owner (you)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Role for current')).not.toBeInTheDocument();
  });

  it('prevents edits while saving', () => {
    renderForm(true);
    expect(screen.getByLabelText('Visibility')).toBeDisabled();
    expect(screen.getByLabelText('Role for reader')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove reader' })).toBeDisabled();
  });
});
