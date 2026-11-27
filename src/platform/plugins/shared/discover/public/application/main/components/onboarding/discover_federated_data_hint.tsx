/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useOnboardingEmptyStateActions } from './onboarding_empty_state_actions';

/**
 * Shown at the top of the results area when the project has no local indices
 * but a registered ES|QL dataset. The editor stays available for that dataset.
 */
export const DiscoverFederatedDataHint = ({ source }: { source: string }) => {
  const { euiTheme } = useEuiTheme();
  const actions = useOnboardingEmptyStateActions();
  const [primary, secondary] = actions;

  return (
    <div
      css={{
        flexShrink: 0,
        padding: euiTheme.size.m,
        paddingBottom: 0,
        width: '100%',
      }}
    >
      <KbnInfoCallout
        data-test-subj="discoverFederatedDataHint"
        size="s"
        title={i18n.translate('discover.federatedDataHint.title', {
          defaultMessage: 'No local indices',
        })}
        text={
          actions.length > 0
            ? i18n.translate('discover.federatedDataHint.description', {
                defaultMessage:
                  'This project has no indices in Elasticsearch. You can still query federated data, starting with {source}.',
                values: { source },
              })
            : i18n.translate('discover.federatedDataHint.askAdminDescription', {
                defaultMessage:
                  'This project has no indices in Elasticsearch. You can still query federated data, starting with {source}. Ask your admin to add data.',
                values: { source },
              })
        }
        actionProps={
          primary
            ? {
                primary: {
                  children: primary.label,
                  href: primary.href,
                  'data-test-subj': primary.id,
                },
                ...(secondary
                  ? {
                      secondary: {
                        children: secondary.label,
                        href: secondary.href,
                        'data-test-subj': secondary.id,
                      },
                    }
                  : {}),
              }
            : undefined
        }
      />
    </div>
  );
};
