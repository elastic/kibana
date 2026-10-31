/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { CanonicalAcl } from '@kbn/access-control';
import type { HttpFetchOptions, HttpHandler } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { AccessCopy } from './copy';
import { ObjectAccessPanel } from './object_access_panel';
import type {
  AccessChangeResponse,
  AccessPolicyResponse,
  AccessStateResponse,
  SuggestedUser,
} from './types';

const OBJECT_PATH = '/internal/security/access_control/action/c1';

const COPY: AccessCopy = { objectNoun: 'connector', generalAccess: {}, entryLevels: {} };

const POLICY: AccessPolicyResponse = {
  enabled: true,
  general_access: { default: 'use', allowed: ['none', 'view', 'use', 'edit'] },
  entry_levels: ['use', 'edit'],
  operations: {
    view: { level: 'view' },
    use: { level: 'use' },
    edit: { level: 'edit' },
    delete: { level: 'edit' },
  },
};

const ACL: CanonicalAcl = {
  version: [1],
  owner: { type: ['user'], id: ['u_owner'] },
  general_access: ['use'],
  entries: [
    { type: ['user'], id: ['u_alice'], access: ['use'], added_at: ['2026-01-01T00:00:00Z'] },
    {
      type: ['service_account'],
      id: ['kibana/svc'],
      access: ['edit'],
      added_at: ['2026-01-01T00:00:00Z'],
    },
  ],
};

const profile = (uid: string, fullName: string) => ({
  uid,
  enabled: true,
  user: { username: uid, email: `${uid}@example.com`, full_name: fullName },
  data: {},
});

const BOB: SuggestedUser = { ...profile('u_bob', 'Bob Builder'), eligible_levels: ['use', 'edit'] };

const MANAGER_STATE: AccessStateResponse = {
  type: 'action',
  id: 'c1',
  version: 'v1',
  state: 'valid',
  restricted: true,
  is_owner: true,
  permissions: ['view', 'use', 'edit', 'delete', 'manage_access', 'transfer'],
  via_recovery: [],
  can_claim: false,
  current_principal: { type: 'user', id: 'u_owner' },
  acl: ACL,
  profiles: [profile('u_owner', 'Olivia Owner'), profile('u_alice', 'Alice Archer')],
};

const VIEWER_STATE: AccessStateResponse = {
  ...MANAGER_STATE,
  is_owner: false,
  permissions: ['view', 'use'],
  current_principal: { type: 'user', id: 'u_viewer' },
  acl: undefined,
  profiles: undefined,
};

const httpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { body: { statusCode, message } });

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const selectGeneralAccess = async (level: string) => {
  await userEvent.click(screen.getByTestId('accessPanelGeneralAccess'));
  await waitForEuiPopoverOpen();
  await userEvent.click(screen.getByTestId(`accessPanelGeneralAccessOption-${level}`));
};

describe('ObjectAccessPanel', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let policy: AccessPolicyResponse;
  let objectState: AccessStateResponse;
  let objectError: Error | undefined;
  const toasts = { addSuccess: jest.fn(), addWarning: jest.fn() };
  const onAccessChange = jest.fn();

  // The panel always calls `http` with a path and options.
  const callsOf = ({ mock }: { mock: { calls: unknown[][] } }) =>
    mock.calls as Array<[path: string, options?: HttpFetchOptions]>;
  const getCalls = (path: string) =>
    callsOf(http.get).filter(([calledPath]) => calledPath === path);
  const bodyOf = (options?: HttpFetchOptions) => JSON.parse(String(options?.body));
  const postBody = (suffix: string) => {
    const calls = callsOf(http.post).filter(([path]) => path === `${OBJECT_PATH}${suffix}`);
    expect(calls).toHaveLength(1);
    return bodyOf(calls[0][1]);
  };

  const renderPanel = () =>
    render(
      <ObjectAccessPanel
        http={http}
        toasts={toasts}
        type="action"
        id="c1"
        copy={COPY}
        onAccessChange={onAccessChange}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    policy = POLICY;
    objectState = MANAGER_STATE;
    objectError = undefined;

    http = httpServiceMock.createStartContract();
    http.get.mockImplementation((async (path: string) => {
      if (path === '/internal/security/access_control/action/_policy') {
        return clone(policy);
      }
      if (path === OBJECT_PATH) {
        if (objectError) {
          throw objectError;
        }
        // A fresh object per response, as a real server returns.
        return clone(objectState);
      }
      throw new Error(`Unexpected GET ${path}`);
    }) as HttpHandler);
    http.put.mockResolvedValue({ version: 'v2', warnings: [] });
    http.post.mockImplementation((async (path: string) => {
      if (path.endsWith('/_suggest_principals')) {
        return { users: [BOB] };
      }
      return { version: 'v2', warnings: [] };
    }) as HttpHandler);
  });

  it('shows a loading state until the policy and access load', () => {
    http.get.mockReturnValue(new Promise(() => {}));
    renderPanel();

    expect(screen.getByTestId('accessPanelLoading')).toBeInTheDocument();
  });

  it('shows the disabled callout and does not load the object while disabled', async () => {
    policy = { ...POLICY, enabled: false };
    renderPanel();

    expect(await screen.findByTestId('accessPanelDisabled')).toBeInTheDocument();
    expect(getCalls(OBJECT_PATH)).toHaveLength(0);
    expect(screen.queryByTestId('accessPanel')).not.toBeInTheDocument();
  });

  it('shows the not-found message when the object fails to load with 404', async () => {
    objectError = httpError(404, 'Not Found');
    renderPanel();

    expect(await screen.findByTestId('accessPanelError')).toHaveTextContent(
      'The connector was not found or you can no longer access it.'
    );
  });

  it('lets a manager change general access and entries and saves with the loaded version', async () => {
    renderPanel();
    expect(await screen.findByTestId('accessPanelOwner')).toHaveTextContent('Olivia Owner');
    expect(screen.getByTestId('accessPanelSave')).toBeDisabled();

    await selectGeneralAccess('none');
    await userEvent.selectOptions(screen.getByTestId('accessPanelEntryLevel-u_alice'), 'edit');
    await userEvent.click(screen.getByTestId('accessPanelEntryRemove-kibana/svc'));
    expect(screen.queryByTestId('accessPanelEntry-kibana/svc')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('accessPanelSave'));

    await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalledWith('Access saved.'));
    expect(http.put).toHaveBeenCalledTimes(1);
    const [path, options] = callsOf(http.put)[0];
    expect(path).toBe(OBJECT_PATH);
    expect(bodyOf(options)).toEqual({
      version: 'v1',
      general_access: 'none',
      entries: [{ type: 'user', id: 'u_alice', access: 'edit' }],
    });
    expect(toasts.addWarning).not.toHaveBeenCalled();
    expect(onAccessChange).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getCalls(OBJECT_PATH)).toHaveLength(2));
  });

  it('discards unsaved changes', async () => {
    renderPanel();
    await userEvent.click(await screen.findByTestId('accessPanelEntryRemove-u_alice'));
    expect(screen.queryByTestId('accessPanelEntry-u_alice')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('accessPanelCancel'));

    expect(screen.getByTestId('accessPanelEntry-u_alice')).toBeInTheDocument();
    expect(screen.getByTestId('accessPanelSave')).toBeDisabled();
  });

  it('marks entries from save warnings and uses the warning toast', async () => {
    const response: AccessChangeResponse = {
      version: 'v2',
      warnings: [
        {
          principal: { type: 'user', id: 'u_alice' },
          level: 'edit',
          reason: 'missing_feature_privileges',
        },
      ],
    };
    http.put.mockResolvedValue(response);
    renderPanel();

    await userEvent.selectOptions(
      await screen.findByTestId('accessPanelEntryLevel-u_alice'),
      'edit'
    );
    // The reload after the save returns the stored change.
    objectState = {
      ...MANAGER_STATE,
      version: 'v2',
      acl: { ...ACL, entries: [{ ...ACL.entries[0], access: ['edit'] }, ACL.entries[1]] },
    };
    await userEvent.click(screen.getByTestId('accessPanelSave'));

    await waitFor(() => expect(toasts.addWarning).toHaveBeenCalledTimes(1));
    expect(toasts.addWarning).toHaveBeenCalledWith(expect.stringContaining('Access saved.'));
    expect(toasts.addSuccess).not.toHaveBeenCalled();
    expect(await screen.findByTestId('accessPanelEntryWarning-u_alice')).toBeInTheDocument();
    expect(screen.queryByTestId('accessPanelEntryWarning-kibana/svc')).not.toBeInTheDocument();
  });

  it('shows the read-only summary to people who cannot manage access', async () => {
    objectState = VIEWER_STATE;
    renderPanel();

    expect(await screen.findByTestId('accessPanelReadOnly')).toBeInTheDocument();
    // The icon's accessible label renders as text in the test environment.
    expect(screen.getByTestId('accessPanelPermission-view')).toHaveTextContent(/^Allowed\s*View$/);
    expect(screen.getByTestId('accessPanelPermission-use')).toHaveTextContent(/^Allowed\s*Use$/);
    for (const operation of ['edit', 'delete', 'manage_access']) {
      expect(screen.getByTestId(`accessPanelPermission-${operation}`)).toHaveTextContent(
        /^Not allowed/
      );
    }
    expect(screen.queryByTestId('accessPanelGeneralAccess')).not.toBeInTheDocument();
    expect(screen.queryByTestId('accessPanelList')).not.toBeInTheDocument();
    expect(screen.queryByTestId('accessPanelSave')).not.toBeInTheDocument();
  });

  describe('claim', () => {
    beforeEach(() => {
      objectState = {
        ...MANAGER_STATE,
        is_owner: false,
        can_claim: true,
        acl: { ...ACL, owner: { type: [], id: [] } },
      };
    });

    it('claims without changing general access by default', async () => {
      renderPanel();
      await userEvent.click(await screen.findByTestId('accessPanelClaim'));

      await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalledWith('You are now the owner.'));
      expect(postBody('/_claim')).toEqual({ version: 'v1' });
    });

    it('restricts general access when the checkbox is checked', async () => {
      renderPanel();
      expect(await screen.findByTestId('accessPanelClaimCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('accessPanelOwner')).not.toBeInTheDocument();

      await userEvent.click(screen.getByLabelText('Also make it visible only to me'));
      await userEvent.click(screen.getByTestId('accessPanelClaim'));

      await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalledWith('You are now the owner.'));
      expect(postBody('/_claim')).toEqual({ version: 'v1', general_access: 'none' });
    });
  });

  it('shows the conflict callout on a 409 and reloads on demand', async () => {
    http.put.mockRejectedValue(httpError(409, 'Version conflict'));
    renderPanel();

    await userEvent.click(await screen.findByTestId('accessPanelEntryRemove-u_alice'));
    await userEvent.click(screen.getByTestId('accessPanelSave'));

    expect(await screen.findByTestId('accessPanelConflict')).toBeInTheDocument();
    expect(toasts.addSuccess).not.toHaveBeenCalled();
    expect(getCalls(OBJECT_PATH)).toHaveLength(1);

    await userEvent.click(screen.getByTestId('accessPanelConflictReload'));

    await waitFor(() => expect(getCalls(OBJECT_PATH)).toHaveLength(2));
    expect(screen.queryByTestId('accessPanelConflict')).not.toBeInTheDocument();
  });

  it('shows the recovery callout when managing access through recovery', async () => {
    objectState = { ...MANAGER_STATE, is_owner: false, via_recovery: ['manage_access'] };
    renderPanel();

    expect(await screen.findByTestId('accessPanelRecovery')).toBeInTheDocument();
    expect(screen.queryByTestId('accessPanelInvalidAcl')).not.toBeInTheDocument();
  });

  it('shows the damaged-ACL callout for an invalid ACL', async () => {
    objectState = { ...MANAGER_STATE, state: 'invalid', via_recovery: ['manage_access'] };
    renderPanel();

    expect(await screen.findByTestId('accessPanelInvalidAcl')).toHaveTextContent(
      "This connector's access data is damaged."
    );
    expect(screen.queryByTestId('accessPanelRecovery')).not.toBeInTheDocument();
  });

  it('transfers ownership to a picked user', async () => {
    renderPanel();
    await userEvent.click(await screen.findByTestId('accessPanelTransfer'));
    const modal = await screen.findByTestId('accessPanelTransferModal');
    expect(within(modal).getByTestId('accessPanelTransferConfirm')).toBeDisabled();

    // One change event is all the picker needs to search, without a re-render per keystroke.
    fireEvent.change(
      within(within(modal).getByTestId('accessPanelTransferPicker')).getByRole('combobox'),
      { target: { value: 'bob' } }
    );
    await userEvent.click(await screen.findByTestId('accessPanelTransferPickerOption-u_bob'));
    await userEvent.click(within(modal).getByTestId('accessPanelTransferConfirm'));

    await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalledWith('Ownership transferred.'));
    expect(postBody('/_transfer')).toEqual({ version: 'v1', owner: { type: 'user', id: 'u_bob' } });
    await waitFor(() =>
      expect(screen.queryByTestId('accessPanelTransferModal')).not.toBeInTheDocument()
    );
  });
});
