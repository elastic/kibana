/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

const setup = (verifySession: jest.Mock = jest.fn().mockResolvedValue(huntSession)) => {
  const services = createProfileProviderSharedServicesMock();
  const registry = services.discoverShared.features.registry;
  jest
    .spyOn(registry, 'getById')
    .mockImplementation((id: string) =>
      id === 'hunt-session' ? ({ id, verifySession } as never) : undefined
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
