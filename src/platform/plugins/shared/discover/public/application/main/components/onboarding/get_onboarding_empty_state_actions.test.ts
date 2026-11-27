/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../../context_awareness/profiles/root_profile';
import { getOnboardingEmptyStateActions } from './get_onboarding_empty_state_actions';

describe('getOnboardingEmptyStateActions', () => {
  it('returns no actions when the user cannot open any of them', () => {
    expect(
      getOnboardingEmptyStateActions({
        solutionNavId: SolutionType.Observability,
        navLinks: {},
        management: {},
      })
    ).toEqual([]);
  });

  it('keeps the observability logs onboarding link and drops sample data without home', () => {
    expect(
      getOnboardingEmptyStateActions({
        solutionNavId: SolutionType.Observability,
        navLinks: { observabilityOnboarding: true },
        management: {},
      })
    ).toEqual([
      {
        id: 'discoverOnboardingAddObservabilityData',
        label: 'Add data',
        appId: 'observabilityOnboarding',
        path: '?category=logs',
        isPrimary: true,
      },
    ]);
  });

  it('offers integrations and sample data for Security', () => {
    const actions = getOnboardingEmptyStateActions({
      solutionNavId: SolutionType.Security,
      navLinks: { integrations: true, home: true },
      management: {},
    });

    expect(actions.map((action) => [action.appId, action.path])).toEqual([
      ['integrations', '/browse'],
      ['home', '#/tutorial_directory/sampleData'],
    ]);
    expect(actions[0].isPrimary).toBe(true);
    expect(actions[1].isPrimary).toBe(false);
  });

  it('offers getting started and data federation for Search', () => {
    const actions = getOnboardingEmptyStateActions({
      solutionNavId: SolutionType.Search,
      navLinks: { searchGettingStarted: true },
      management: { data: { data_federation: true } },
    });

    expect(actions.map((action) => action.id)).toEqual([
      'discoverOnboardingAddSearchData',
      'discoverOnboardingConnectExternal',
    ]);
    expect(actions[1]).toEqual(
      expect.objectContaining({
        appId: 'management',
        path: '/data/data_federation',
        isPrimary: false,
      })
    );
  });

  it('hides data federation without the management privilege', () => {
    const actions = getOnboardingEmptyStateActions({
      solutionNavId: SolutionType.Search,
      navLinks: { searchGettingStarted: true },
      management: { data: { data_federation: false } },
    });

    expect(actions.map((action) => action.id)).toEqual(['discoverOnboardingAddSearchData']);
  });
});
