/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getOnboardingEmptyStateActions } from './get_onboarding_empty_state_actions';

/**
 * Add-data actions for the open solution. The first allowed action is primary.
 */
export const useOnboardingEmptyStateActions = () => {
  const services = useDiscoverServices();
  const solutionNavId = useObservable(
    services.core.chrome.getActiveSolutionNavId$(),
    services.core.chrome.getActiveSolutionNavId()
  );

  return useMemo(
    () =>
      getOnboardingEmptyStateActions({
        solutionNavId,
        navLinks: services.capabilities.navLinks,
        management: services.capabilities.management,
      }).map((action) => ({
        ...action,
        href: services.application.getUrlForApp(action.appId, { path: action.path }),
      })),
    [
      services.application,
      services.capabilities.management,
      services.capabilities.navLinks,
      solutionNavId,
    ]
  );
};

export const OnboardingEmptyStateActions = ({
  justify = 'center',
}: {
  justify?: 'center' | 'flexStart';
}) => {
  const actions = useOnboardingEmptyStateActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup responsive={false} alignItems="center" justifyContent={justify} wrap>
      {actions.map((action) => (
        <EuiFlexItem key={action.id} grow={false}>
          <EuiButton
            color="primary"
            fill={action.isPrimary}
            href={action.href}
            data-test-subj={action.id}
          >
            {action.label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
