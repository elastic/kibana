/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';

import {
  EuiPageBody,
  EuiPageHeader,
  EuiSpacer,
  useEuiTheme,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CardsNavigation } from '@kbn/management-cards-navigation';
import { AutoOpsPromotionCallout } from '@kbn/autoops-promotion-callout';

import { useAppContext } from '../management_app/management_context';
import { ClassicEmptyPrompt } from './classic_empty_prompt';
import { SolutionEmptyPrompt } from './solution_empty_prompt';

interface ManagementLandingPageProps {
  onAppMounted: (id: string) => void;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({
  setBreadcrumbs,
  onAppMounted,
}: ManagementLandingPageProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    appBasePath,
    sections,
    kibanaVersion,
    cardsNavigationConfig,
    chromeStyle,
    coreStart,
    cloud,
    isAirGapped,
    getAutoOpsStatusHook,
  } = useAppContext();
  setBreadcrumbs();

  // Check AutoOps status
  const useAutoOpsStatus = getAutoOpsStatusHook();
  const autoOpsStatus = useAutoOpsStatus();

  // Check if cloud services are available
  const isCloudEnabled = cloud?.isCloudEnabled || false;
  // AutoOps promotion callout should only be shown for self-managed, non-air-gapped instances
  // and not already connected to AutoOps
  const shouldShowAutoOpsPromotion =
    !isCloudEnabled &&
    !isAirGapped &&
    !autoOpsStatus.isLoading &&
    !autoOpsStatus.isCloudConnectAutoopsEnabled;
  const cloudConnectUrl = coreStart.application.getUrlForApp('cloud_connect');
  const handleConnectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    coreStart.application.navigateToApp('cloud_connect');
  };
  const hasCloudConnectPermission = Boolean(
    coreStart.application.capabilities.cloudConnect?.show ||
      coreStart.application.capabilities.cloudConnect?.configure
  );

  useEffect(() => {
    onAppMounted('');
  }, [onAppMounted]);

  if (cardsNavigationConfig?.enabled) {
    return (
      <EuiPageBody restrictWidth={false} data-test-subj="cards-navigation-page">
        <CardsNavigation
          sections={sections}
          appBasePath={appBasePath}
          hideLinksTo={cardsNavigationConfig?.hideLinksTo}
          extendedCardNavigationDefinitions={cardsNavigationConfig?.extendCardNavDefinitions}
        />
      </EuiPageBody>
    );
  }

  if (!chromeStyle) return null;

  if (chromeStyle === 'project') {
    return (
      <EuiPageBody restrictWidth={false}>
        <EuiPageHeader
          bottomBorder
          data-test-subj="managementLandingPageHeader"
          pageTitle={i18n.translate('management.landing.pageTitle', {
            defaultMessage: 'Management',
          })}
        />
        <EuiSpacer size="l" />
        <SolutionEmptyPrompt kibanaVersion={kibanaVersion} coreStart={coreStart} />
      </EuiPageBody>
    );
  }

  return (
    <EuiPageBody restrictWidth={false}>
      <EuiPageHeader
        bottomBorder
        data-test-subj="managementLandingPageHeader"
        pageTitle={i18n.translate('management.landing.pageTitle', {
          defaultMessage: 'Management',
        })}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          {shouldShowAutoOpsPromotion && (
            <div
              css={css`
                max-width: 600px;
              `}
            >
              <AutoOpsPromotionCallout
                cloudConnectUrl={cloudConnectUrl}
                onConnectClick={handleConnectClick}
                hasCloudConnectPermission={hasCloudConnectPermission}
                overrideCalloutProps={{ style: { margin: `0 ${euiTheme.size.l}` } }}
              />
            </div>
          )}
          <ClassicEmptyPrompt kibanaVersion={kibanaVersion} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageBody>
  );
};
