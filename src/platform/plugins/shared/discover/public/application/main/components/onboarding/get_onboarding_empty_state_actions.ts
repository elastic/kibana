/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Capabilities } from '@kbn/core/public';
import { SolutionType } from '../../../../context_awareness/profiles/root_profile';

export interface OnboardingEmptyStateAction {
  id: string;
  label: string;
  /** Application id passed to `application.getUrlForApp`. */
  appId: string;
  /** Path inside that application. Omitted when the app root is the destination. */
  path?: string;
  isPrimary: boolean;
}

interface ActionAccess {
  navLinks: Capabilities['navLinks'] | undefined;
  management: Capabilities['management'] | undefined;
}

interface ActionDefinition {
  id: string;
  label: string;
  appId: string;
  path?: string;
  isAllowed: (access: ActionAccess) => boolean;
}

const ADD_DATA_LABEL = i18n.translate('discover.onboardingEmptyState.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

const SAMPLE_DATA_LABEL = i18n.translate('discover.onboardingEmptyState.trySampleDataButtonLabel', {
  defaultMessage: 'Try sample data',
});

const CONNECT_EXTERNAL_LABEL = i18n.translate(
  'discover.onboardingEmptyState.connectExternalButtonLabel',
  {
    defaultMessage: 'Connect to external data sources',
  }
);

const hasNavLink =
  (navLinkId: string) =>
  ({ navLinks }: ActionAccess) =>
    navLinks?.[navLinkId] === true;

const hasManagementApp =
  (sectionId: string, appId: string) =>
  ({ management }: ActionAccess) =>
    management?.[sectionId]?.[appId] === true;

const SAMPLE_DATA_ACTION: ActionDefinition = {
  id: 'discoverOnboardingTrySampleData',
  label: SAMPLE_DATA_LABEL,
  appId: 'home',
  path: '#/tutorial_directory/sampleData',
  isAllowed: hasNavLink('home'),
};

const INTEGRATIONS_ACTION: ActionDefinition = {
  id: 'discoverOnboardingAddIntegrations',
  label: ADD_DATA_LABEL,
  appId: 'integrations',
  path: '/browse',
  isAllowed: hasNavLink('integrations'),
};

/**
 * One primary action and up to two secondary actions for the solution that is open.
 * Each action is included only when the user can open its app.
 */
export const getOnboardingEmptyStateActions = ({
  solutionNavId,
  navLinks,
  management,
}: {
  solutionNavId: string | null | undefined;
  navLinks: Capabilities['navLinks'] | undefined;
  management: Capabilities['management'] | undefined;
}): OnboardingEmptyStateAction[] => {
  const access = { navLinks, management };
  const allowed = getActionDefinitions(solutionNavId).filter((definition) =>
    definition.isAllowed(access)
  );

  return allowed.slice(0, 3).map((definition, index) => ({
    id: definition.id,
    label: definition.label,
    appId: definition.appId,
    path: definition.path,
    isPrimary: index === 0,
  }));
};

const getActionDefinitions = (solutionNavId: string | null | undefined): ActionDefinition[] => {
  if (solutionNavId === SolutionType.Observability) {
    return [
      {
        id: 'discoverOnboardingAddObservabilityData',
        label: ADD_DATA_LABEL,
        appId: 'observabilityOnboarding',
        path: '?category=logs',
        isAllowed: hasNavLink('observabilityOnboarding'),
      },
      SAMPLE_DATA_ACTION,
    ];
  }

  if (solutionNavId === SolutionType.Security) {
    return [INTEGRATIONS_ACTION, SAMPLE_DATA_ACTION];
  }

  if (solutionNavId === SolutionType.Search) {
    return [
      {
        id: 'discoverOnboardingAddSearchData',
        label: ADD_DATA_LABEL,
        appId: 'searchGettingStarted',
        isAllowed: hasNavLink('searchGettingStarted'),
      },
      {
        id: 'discoverOnboardingConnectExternal',
        label: CONNECT_EXTERNAL_LABEL,
        appId: 'management',
        path: '/data/data_federation',
        isAllowed: hasManagementApp('data', 'data_federation'),
      },
    ];
  }

  return [INTEGRATIONS_ACTION, SAMPLE_DATA_ACTION];
};
