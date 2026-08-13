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

import { EuiPageBody, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { CardsNavigation } from '@kbn/management-cards-navigation';
import { AutoOpsPromotionCallout, AutoOpsEnabledCallout } from '@kbn/autoops-promotion-callout';

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

  const hideAnnouncements = !coreStart.notifications.tours.isEnabled();

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
    !autoOpsStatus.isCloudConnectAutoopsEnabled &&
    !hideAnnouncements;

  // AutoOps enabled banner appears once the cluster has been connected and AutoOps is active
  const shouldShowAutoOpsEnabledBanner =
    !isAirGapped && autoOpsStatus.isCloudConnectAutoopsEnabled && !hideAnnouncements;
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
      <EuiPageBody restrictWidth={true} data-test-subj="cards-navigation-page">
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
    return <SolutionEmptyPrompt kibanaVersion={kibanaVersion} coreStart={coreStart} />;
  }

  /* Matches the max-width of the KibanaPageTemplate.EmptyPrompt below */
  // KibanaPageTemplate.EmptyPrompt (rendered below) constrains its content to this width.
  // We match it so the callouts visually align with the welcome prompt.
  const AUTOOPS_CALLOUT_MAX_WIDTH = 556;

  const calloutWrapperCss = css`
    max-width: ${AUTOOPS_CALLOUT_MAX_WIDTH}px;
    margin: 0 auto;
  `;

  return (
    <EuiPageBody restrictWidth={true}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          {shouldShowAutoOpsPromotion && (
            <div css={calloutWrapperCss}>
              <AutoOpsPromotionCallout
                cloudConnectUrl={cloudConnectUrl}
                onConnectClick={handleConnectClick}
                hasCloudConnectPermission={hasCloudConnectPermission}
              />
            </div>
          )}
          {shouldShowAutoOpsEnabledBanner && (
            <div css={calloutWrapperCss}>
              <AutoOpsEnabledCallout
                autoOpsUrl={autoOpsStatus.autoOpsServiceUrl}
                docsUrl={autoOpsStatus.autoOpsDocsUrl}
              />
            </div>
          )}
          <ClassicEmptyPrompt kibanaVersion={kibanaVersion} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageBody>
  );
};
