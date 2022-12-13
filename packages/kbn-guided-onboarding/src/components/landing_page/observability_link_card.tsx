/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { NavigateToAppOptions } from '@kbn/core-application-browser';
import { UseCaseCard } from './use_case_card';

interface LinkCardConstants {
  observability: {
    i18nTexts: {
      title: string;
      description: string;
    };
  };
}

const constants: LinkCardConstants = {
  observability: {
    i18nTexts: {
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.linkCard.observability.cardTitle',
        {
          defaultMessage: 'Observe my data',
        }
      ),
      description: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.linkCard.observability.cardDescription',
        {
          defaultMessage:
            'Add application, infrastructure, and user data through our pre-built integrations.',
        }
      ),
    },
  },
};

export const ObservabilityLinkCard = ({
  navigateToApp,
  isDarkTheme,
  addBasePath,
}: {
  navigateToApp: (appId: string, options?: NavigateToAppOptions) => Promise<void>;
  isDarkTheme: boolean;
  addBasePath: (url: string) => string;
}) => {
  const navigateToIntegrations = () => {
    navigateToApp('integrations', {
      path: '/browse/infrastructure',
    });
  };
  const button = (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          // Used for FS tracking
          data-test-subj={`onboarding--linkCard--observability`}
          fill
          onClick={navigateToIntegrations}
        >
          {i18n.translate('guidedOnboardingPackage.gettingStarted.linkCard.buttonLabel', {
            defaultMessage: 'View integrations',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return (
    <UseCaseCard
      useCase={'observability'}
      title={constants.observability.i18nTexts.title}
      description={constants.observability.i18nTexts.description}
      footer={button}
      isDarkTheme={isDarkTheme}
      addBasePath={addBasePath}
    />
  );
};
