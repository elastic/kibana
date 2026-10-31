/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { Principal } from '@kbn/access-control';
import { AccessDraftEditor, type AccessDraftEditorProps } from './access_draft_editor';
import type { AccessDraft, AccessPolicyResponse, SuggestedUser } from './types';

const POLICY: AccessPolicyResponse = {
  enabled: true,
  general_access: { default: 'use', allowed: ['none', 'view', 'use', 'edit'] },
  entry_levels: ['use', 'edit'],
  operations: { view: { level: 'view' }, use: { level: 'use' }, edit: { level: 'edit' } },
};

const suggestedUser = (
  uid: string,
  fullName: string,
  eligibleLevels: SuggestedUser['eligible_levels'] = ['use', 'edit']
): SuggestedUser => ({
  uid,
  enabled: true,
  user: { username: uid, email: `${uid}@example.com`, full_name: fullName },
  data: {},
  eligible_levels: eligibleLevels,
});

const OWNER = suggestedUser('u_owner', 'Olivia Owner');
const ALICE = suggestedUser('u_alice', 'Alice Archer');
const BOB = suggestedUser('u_bob', 'Bob Builder');
const VIEWER = suggestedUser('u_viewer', 'Victor Viewer', ['view']);

const ALICE_ENTRY = { type: 'user' as const, id: 'u_alice', access: 'use' as const };

const selectGeneralAccess = async (level: string) => {
  await userEvent.click(screen.getByTestId('accessPanelGeneralAccess'));
  await waitForEuiPopoverOpen();
  await userEvent.click(screen.getByTestId(`accessPanelGeneralAccessOption-${level}`));
};

describe('AccessDraftEditor', () => {
  let suggestPrincipals: jest.Mock;
  let onChange: jest.Mock;

  // A stateful host, so that picked entries render like they do in a consumer.
  const Host = ({
    initialValue,
    ...props
  }: Partial<AccessDraftEditorProps> & { initialValue: AccessDraft }) => {
    const [value, setValue] = useState(initialValue);
    return (
      <AccessDraftEditor
        policy={POLICY}
        copy={{ objectNoun: 'connector', generalAccess: {}, entryLevels: {} }}
        suggestPrincipals={suggestPrincipals}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
        {...props}
      />
    );
  };

  const getPickerInput = () =>
    within(screen.getByTestId('accessPanelPrincipalPicker')).getByRole('combobox');

  beforeEach(() => {
    onChange = jest.fn();
    suggestPrincipals = jest.fn(async (name: string) =>
      [OWNER, ALICE, BOB, VIEWER].filter(({ user }) =>
        user.full_name?.toLowerCase().includes(name.toLowerCase())
      )
    );
  });

  it('adds a picked user with the first entry level of the policy', async () => {
    render(<Host initialValue={{ general_access: 'use', entries: [] }} />);

    fireEvent.change(getPickerInput(), { target: { value: 'bob' } });
    await userEvent.click(await screen.findByTestId('accessPanelPrincipalPickerOption-u_bob'));

    expect(onChange).toHaveBeenLastCalledWith({
      general_access: 'use',
      entries: [{ type: 'user', id: 'u_bob', access: 'use' }],
    });
    expect(screen.getByTestId('accessPanelEntry-u_bob')).toHaveTextContent('Bob Builder');
    expect(screen.queryByTestId('accessPanelEntryWarning-u_bob')).not.toBeInTheDocument();
  });

  it('adds a typed service account ID', async () => {
    render(<Host initialValue={{ general_access: 'use', entries: [] }} />);

    await userEvent.type(getPickerInput(), 'kibana/x{enter}');

    expect(onChange).toHaveBeenLastCalledWith({
      general_access: 'use',
      entries: [{ type: 'service_account', id: 'kibana/x', access: 'use' }],
    });
    expect(screen.getByTestId('accessPanelEntry-kibana/x')).toHaveTextContent('Service account');
  });

  it.each(['not-a-service-account', 'kibana/x/y', 'kibana/'])(
    'rejects the invalid service account ID %s',
    async (id) => {
      render(<Host initialValue={{ general_access: 'use', entries: [] }} />);

      await userEvent.type(getPickerInput(), `${id}{enter}`);

      expect(onChange).not.toHaveBeenCalled();
    }
  );

  it('rejects a service account that already has an entry', async () => {
    render(
      <Host
        initialValue={{
          general_access: 'use',
          entries: [{ type: 'service_account', id: 'kibana/x', access: 'use' }],
        }}
      />
    );

    await userEvent.type(getPickerInput(), 'kibana/x{enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('excludes the owner and existing entries from suggestions', async () => {
    const owner: Principal = { type: 'user', id: 'u_owner' };
    render(<Host owner={owner} initialValue={{ general_access: 'use', entries: [ALICE_ENTRY] }} />);

    await userEvent.click(getPickerInput());

    await waitFor(() => expect(suggestPrincipals).toHaveBeenCalledWith('', expect.anything()));
    const options = await within(await screen.findByRole('listbox')).findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Bob Builder'),
      expect.stringContaining('Victor Viewer'),
    ]);
  });

  it('warns when a picked user cannot use the level of the new entry', async () => {
    render(<Host initialValue={{ general_access: 'use', entries: [] }} />);

    fireEvent.change(getPickerInput(), { target: { value: 'victor' } });
    await userEvent.click(await screen.findByTestId('accessPanelPrincipalPickerOption-u_viewer'));

    expect(screen.getByTestId('accessPanelEntryWarning-u_viewer')).toBeInTheDocument();
  });

  it('counts only saved entries when general access is lowered', async () => {
    const bobEntry = { type: 'user' as const, id: 'u_bob', access: 'use' as const };
    render(
      <Host
        savedValue={{ general_access: 'use', entries: [ALICE_ENTRY] }}
        initialValue={{ general_access: 'use', entries: [ALICE_ENTRY, bobEntry] }}
      />
    );
    expect(screen.queryByTestId('accessPanelRetainedGrants')).not.toBeInTheDocument();

    await selectGeneralAccess('none');

    expect(onChange).toHaveBeenLastCalledWith({
      general_access: 'none',
      entries: [ALICE_ENTRY, bobEntry],
    });
    expect(screen.getByTestId('accessPanelRetainedGrants')).toHaveTextContent(
      '1 person listed below keeps their access.'
    );
  });

  it('does not show the retained-grants callout when general access is raised', async () => {
    render(
      <Host
        savedValue={{ general_access: 'use', entries: [ALICE_ENTRY] }}
        initialValue={{ general_access: 'use', entries: [ALICE_ENTRY] }}
      />
    );

    await selectGeneralAccess('edit');

    expect(screen.queryByTestId('accessPanelRetainedGrants')).not.toBeInTheDocument();
  });

  it('disables the picker at the entry limit', () => {
    const entries = Array.from({ length: 100 }, (_, index) => ({
      type: 'user' as const,
      id: `u_${index}`,
      access: 'use' as const,
    }));
    render(<Host initialValue={{ general_access: 'use', entries }} />);

    expect(getPickerInput()).toBeDisabled();
  });

  it('keeps the picker enabled below the entry limit', () => {
    render(<Host initialValue={{ general_access: 'use', entries: [ALICE_ENTRY] }} />);

    expect(getPickerInput()).toBeEnabled();
  });
});
