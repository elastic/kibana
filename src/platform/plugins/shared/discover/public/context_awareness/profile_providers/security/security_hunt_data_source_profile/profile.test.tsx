/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/react-kibana-mount', () => ({ toMountPoint: (element: unknown) => element }));

import type { HuntSessionInfo } from '@kbn/discover-shared-plugin/public';
import { AppMenuRegistry } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../toolkit';
import { SECURITY_PROFILE_ID } from '../constants';
import { createSecurityHuntDataSourceProfileProvider, HUNT_MAX_SELECTED_ROWS } from './profile';

const huntSession: HuntSessionInfo = {
  sessionId: 'session-1',
  sessionExecutionId: 'execution-1',
  expiresAt: '2026-11-05T00:00:00.000Z',
  definition: {
    id: 'rare_lsass_process_access',
    version: 1,
    name: 'Rare LSASS access',
    hypothesis: 'Credential dumping',
    resultKind: 'raw_event',
    references: [],
    guidance: { analystNotes: [], expectedFalsePositives: [], suggestedPivots: [] },
  },
};

const rootContext = (solutionType: SolutionType) => ({ profileId: 'root', solutionType });
const CLASSIC_ROOT_CONTEXT = {
  profileId: 'classic-nav-root-profile',
  solutionType: SolutionType.Default,
};
const state = (token?: unknown) => ({ huntSession: { token } } as never);

const setup = (
  verifySession: jest.Mock = jest.fn().mockResolvedValue(huntSession),
  preserveEvidence: jest.Mock = jest.fn()
) => {
  const services = createProfileProviderSharedServicesMock();
  const registry = services.discoverShared.features.registry;
  jest
    .spyOn(registry, 'getById')
    .mockImplementation((id: string) =>
      id === 'hunt-session' ? ({ id, verifySession, preserveEvidence } as never) : undefined
    );
  return {
    services,
    provider: createSecurityHuntDataSourceProfileProvider(services),
    verifySession,
  };
};

describe('createSecurityHuntDataSourceProfileProvider', () => {
  it('has its own profile id and matches a verified session in Security navigation', async () => {
    const { provider, verifySession } = setup();

    const result = await provider.resolve({
      rootContext: rootContext(SolutionType.Security),
      profileState: state('signed'),
    });

    expect(provider.profileId).toBe(SECURITY_PROFILE_ID.hunt);
    expect(verifySession).toHaveBeenCalledWith('signed');
    expect(result).toMatchObject({
      isMatch: true,
      context: { category: DataSourceCategory.Security, huntSession },
    });
  });

  it('matches in Classic navigation without needing a Security data view', async () => {
    const { provider } = setup();

    await expect(
      provider.resolve({ rootContext: CLASSIC_ROOT_CONTEXT, profileState: state('signed') })
    ).resolves.toMatchObject({ isMatch: true });
  });

  it('does not match in Classic navigation when solution profiles are disabled', async () => {
    const { services, provider, verifySession } = setup();
    jest.spyOn(services.uiSettings, 'get').mockReturnValueOnce(false);

    await expect(
      provider.resolve({ rootContext: CLASSIC_ROOT_CONTEXT, profileState: state('signed') })
    ).resolves.toEqual({ isMatch: false });
    expect(verifySession).not.toHaveBeenCalled();
  });

  it('does not match in another solution view', async () => {
    const { provider, verifySession } = setup();

    await expect(
      provider.resolve({
        rootContext: rootContext(SolutionType.Observability),
        profileState: state('signed'),
      })
    ).resolves.toEqual({ isMatch: false });
    expect(verifySession).not.toHaveBeenCalled();
  });

  it.each([
    ['no profile state', undefined],
    ['no token', {}],
    ['an empty token', state('')],
    ['a non-string token', state(42)],
  ])('does not match with %s and never asks the server', async (_label, profileState) => {
    const { provider, verifySession } = setup();

    await expect(
      provider.resolve({
        rootContext: rootContext(SolutionType.Security),
        profileState: profileState as never,
      })
    ).resolves.toEqual({ isMatch: false });
    expect(verifySession).not.toHaveBeenCalled();
  });

  it('does not match when the server does not verify the token', async () => {
    const { provider } = setup(jest.fn().mockResolvedValue(undefined));

    await expect(
      provider.resolve({
        rootContext: rootContext(SolutionType.Security),
        profileState: state('forged'),
      })
    ).resolves.toEqual({ isMatch: false });
  });

  it('does not match when no hunt-session feature is registered', async () => {
    const { services, provider } = setup();
    jest.spyOn(services.discoverShared.features.registry, 'getById').mockReturnValue(undefined);

    await expect(
      provider.resolve({
        rootContext: rootContext(SolutionType.Security),
        profileState: state('signed'),
      })
    ).resolves.toEqual({ isMatch: false });
  });

  describe('extension points', () => {
    const context = { category: DataSourceCategory.Security, huntSession };
    const record = (id: string) =>
      ({ id, raw: { _index: 'logs-x' }, flattened: {} } as DataTableRecord);

    it('adds a guidance item to the app menu', () => {
      const { provider } = setup();
      const getAppMenu = provider.profile.getAppMenu!;
      const prev = () => ({ appMenuRegistry: (registry: AppMenuRegistry) => registry });
      const registry = new AppMenuRegistry();

      getAppMenu(
        prev as never,
        { context, toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT } as never
      )({} as never).appMenuRegistry(registry);

      expect(registry.getItem('hunt-guidance')).toMatchObject({
        id: 'hunt-guidance',
        testId: 'discoverAppMenuHuntGuidance',
      });
    });

    it('offers to preserve, then to add evidence once an Investigation is linked', () => {
      const { provider } = setup();
      const getBulkActions = provider.profile.getBulkActions!;
      const labelFor = (ctx: typeof context & { investigationId?: string }) =>
        getBulkActions(() => [], {
          context: { ...ctx, huntSession: { ...huntSession, ...ctx } },
          toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
        } as never)({} as never)[0].label;

      expect(labelFor(context)).toBe('Preserve as Investigation');
      expect(labelFor({ ...context, investigationId: 'inv-1' })).toBe(
        'Add evidence to Investigation'
      );
    });

    it('disables the action above the row limit and passes earlier actions through', () => {
      const { provider } = setup();
      const earlier = { key: 'earlier', label: 'Earlier', onClick: jest.fn() };
      const actions = provider.profile.getBulkActions!(() => [earlier], {
        context,
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      } as never)({} as never);

      expect(actions.map(({ key }) => key)).toEqual(['earlier', 'hunt-preserve-evidence']);
      const [, hunt] = actions;
      const rows = (count: number) =>
        Array.from({ length: count }, (_, index) => record(String(index)));

      expect(
        hunt.getDisabledReason?.({ selectedDocs: rows(HUNT_MAX_SELECTED_ROWS) })
      ).toBeUndefined();
      expect(hunt.getDisabledReason?.({ selectedDocs: rows(HUNT_MAX_SELECTED_ROWS + 1) })).toMatch(
        /at most 50 rows/
      );
    });
  });
});

describe('preserving selected evidence', () => {
  const context = { category: DataSourceCategory.Security, huntSession };
  const rawRecord = (id: string) =>
    ({ id, raw: { _index: 'logs-x', _id: id }, flattened: {} } as DataTableRecord);

  const open = (
    preserveEvidence: jest.Mock,
    { huntSession: session = huntSession }: { huntSession?: HuntSessionInfo } = {}
  ) => {
    const { services, provider } = setup(undefined, preserveEvidence);
    const close = jest.fn();
    const openModal = jest
      .spyOn(services.core.overlays, 'openModal')
      .mockReturnValue({ close } as never);
    jest.spyOn(services.timefilter, 'getTime').mockReturnValue({ from: 'now-7d', to: 'now' });
    jest
      .spyOn(services.data.query, 'getState')
      .mockReturnValue({ filters: [{ meta: { key: 'a' } }] } as never);
    const addSuccess = jest.spyOn(services.core.notifications.toasts, 'addSuccess');
    const stateAdapter = { getState: () => ({ token: 'old-token' }), setState: jest.fn() };

    const [hunt] = provider.profile.getBulkActions!(() => [], {
      context: { ...context, huntSession: session },
      toolkit: { actions: {}, getStateAdapter: () => stateAdapter },
    } as never)({
      dataView: { id: 'dv-1' },
      query: { esql: 'FROM logs-x' },
      columns: ['@timestamp'],
    } as never) as unknown as Array<{
      onClick: (arg: { selectedDocs: DataTableRecord[] }) => void;
    }>;

    return { hunt, openModal, close, addSuccess, stateAdapter };
  };

  const confirmElement = (openModal: jest.SpyInstance) =>
    openModal.mock.calls[0][0] as { props: { onConfirm: (note: string) => Promise<void> } };

  it('sends the selection and Discover state to the server only on confirm', async () => {
    const preserveEvidence = jest.fn().mockResolvedValue({
      investigationId: 'inv-1',
      investigationUrl: 'http://kibana/app/alertzero?selectedConversationId=inv-1',
      evidenceCount: 3,
      addedCount: 2,
      profileToken: 'new-token',
    });
    const { hunt, openModal, close, addSuccess, stateAdapter } = open(preserveEvidence);

    hunt.onClick({ selectedDocs: [rawRecord('e1'), rawRecord('e2')] });
    expect(preserveEvidence).not.toHaveBeenCalled();
    await confirmElement(openModal).props.onConfirm('Same rare port on both hosts');

    expect(preserveEvidence).toHaveBeenCalledWith({
      token: 'old-token',
      preservationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      query: 'FROM logs-x',
      filters: [{ json: '{"meta":{"key":"a"}}' }],
      timeRange: { from: 'now-7d', to: 'now' },
      columns: ['@timestamp'],
      dataViewId: 'dv-1',
      note: 'Same rare port on both hosts',
      rows: [
        { kind: 'raw_event', index: 'logs-x', id: 'e1' },
        { kind: 'raw_event', index: 'logs-x', id: 'e2' },
      ],
    });
    expect(stateAdapter.setState).toHaveBeenCalledWith({ token: 'new-token' });
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Evidence preserved' })
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('reuses the preservation id when a failed save is retried', async () => {
    const preserveEvidence = jest
      .fn()
      .mockRejectedValueOnce(new Error('try later'))
      .mockResolvedValue({
        investigationId: 'i',
        evidenceCount: 1,
        addedCount: 1,
        profileToken: 't',
      });
    const { hunt, openModal, stateAdapter } = open(preserveEvidence);

    hunt.onClick({ selectedDocs: [rawRecord('e1')] });
    const { onConfirm } = confirmElement(openModal).props;
    await expect(onConfirm('')).rejects.toThrow('try later');
    await onConfirm('');

    const [first, second] = preserveEvidence.mock.calls.map(([request]) => request.preservationId);
    expect(second).toBe(first);
    expect(stateAdapter.setState).toHaveBeenCalledTimes(1);
  });

  it('fails without calling the server when a selected event has no index and id', async () => {
    const preserveEvidence = jest.fn();
    const { hunt, openModal } = open(preserveEvidence);

    hunt.onClick({ selectedDocs: [{ id: 'x', raw: {}, flattened: {} } as DataTableRecord] });

    await expect(confirmElement(openModal).props.onConfirm('')).rejects.toThrow(
      'cannot be preserved'
    );
    expect(preserveEvidence).not.toHaveBeenCalled();
  });
});
