/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  OnboardingEmptyStateActions,
  useOnboardingEmptyStateActions,
} from './onboarding_empty_state_actions';

/**
 * Results-area prompt when no local indices and no ES|QL datasets were found.
 * The query bar stays mounted above this prompt.
 */
export const DiscoverOnboardingEmptyState = () => {
  const actions = useOnboardingEmptyStateActions();

  return (
    <EuiEmptyPrompt
      data-test-subj="discoverOnboardingEmptyState"
      iconType="productDiscover"
      title={
        <h2>
          <FormattedMessage
            id="discover.onboardingEmptyState.noDataTitle"
            defaultMessage="No data yet"
          />
        </h2>
      }
      body={
        <EuiText size="s" color="subdued">
          <p>
            {actions.length > 0 ? (
              <FormattedMessage
                id="discover.onboardingEmptyState.noDataDescription"
                defaultMessage="We didn't find data in this project. You might still have data in another system. Ask your admin to check, or add data here."
              />
            ) : (
              <FormattedMessage
                id="discover.onboardingEmptyState.askAdminDescription"
                defaultMessage="We didn't find data in this project. You might still have data in another system. Ask your admin to check."
              />
            )}
          </p>
        </EuiText>
      }
      actions={actions.length > 0 ? <OnboardingEmptyStateActions /> : undefined}
    />
  );
};
