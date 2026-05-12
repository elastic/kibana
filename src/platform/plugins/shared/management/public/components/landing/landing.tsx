/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageBody,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { CardsNavigation } from '@kbn/management-cards-navigation';
import { AutoOpsPromotionCallout } from '@kbn/autoops-promotion-callout';

import type { CoreStart } from '@kbn/core/public';
import { useAppContext } from '../management_app/management_context';
import { SolutionEmptyPrompt } from './solution_empty_prompt';
import {
  ManagementLandingHeaderDescription,
  ManagementLandingHealthBadge,
} from './environment_health_bar/management_landing_env_widgets';
import { useManagementEnvironmentHealth } from './environment_health_bar/use_management_environment_health';
import { UpgradeAssistantBanner } from './quick_actions/upgrade_assistant_banner';
import { QuickActionsGrid } from './quick_actions/quick_actions_grid';
import { ManagementLandingSettingsPanel } from './management_landing_settings_panel';
import { ManagementLandingWorkflowPaths } from './management_landing_workflow_paths';
import type { EnvironmentHealthResponse } from '../../../common/environment_health';
import type { EnvironmentHealthLoadState } from './environment_health_bar/use_management_environment_health';

function ManagementLandingDocsFooter({ docLinks }: { docLinks: CoreStart['docLinks'] }) {
  const { kibana, releaseNotes } = docLinks.links;
  const breakingChanges = docLinks.links.kibana.upgradeNotes;
  const docEntries = [
    {
      href: kibana.guide,
      testSubj: 'managementLandingDocsLinkGuide',
      message: (
        <FormattedMessage id="management.landing.docs.kibanaGuide" defaultMessage="Documentation" />
      ),
    },
    {
      href: releaseNotes,
      testSubj: 'managementLandingDocsLinkWhatsNew',
      message: (
        <FormattedMessage id="management.landing.docs.whatsNew" defaultMessage="What's new" />
      ),
    },
    {
      href: breakingChanges,
      testSubj: 'managementLandingDocsLinkBreakingChanges',
      message: (
        <FormattedMessage
          id="management.landing.docs.breakingChanges"
          defaultMessage="Breaking changes"
        />
      ),
    },
  ].filter((entry) => typeof entry.href === 'string' && entry.href.length > 0);

  if (docEntries.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup justifyContent="center" gutterSize="l" wrap responsive={false}>
      {docEntries.map((entry) => (
        <EuiFlexItem grow={false} key={entry.testSubj}>
          <EuiLink
            href={entry.href}
            external
            target="_blank"
            rel="noopener noreferrer"
            data-test-subj={entry.testSubj}
          >
            {entry.message}
          </EuiLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

interface ManagementLandingPageProps {
  onAppMounted: (id: string) => void;
  setBreadcrumbs: () => void;
}

interface ManagementLandingClassicBodyProps {
  envLoadState: EnvironmentHealthLoadState;
  envHealth: EnvironmentHealthResponse | null;
}

/** Classic Stack Management landing (not cards nav): header + environment strip + AutoOps. */
function ManagementLandingClassicBody({
  envLoadState,
  envHealth,
}: ManagementLandingClassicBodyProps) {
  const { euiTheme } = useEuiTheme();
  const { coreStart, cloud, isAirGapped, getAutoOpsStatusHook } = useAppContext();

  const clusterNameTitle = useMemo(() => {
    if (envLoadState !== 'ready') {
      return undefined;
    }
    const name = envHealth?.clusterName?.trim();
    return name && name.length > 0 ? name : undefined;
  }, [envLoadState, envHealth?.clusterName]);

  const useAutoOpsStatus = getAutoOpsStatusHook();
  const autoOpsStatus = useAutoOpsStatus();
  const isCloudEnabled = cloud?.isCloudEnabled || false;
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

  const twoColumnLandingGridCss = css`
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
    gap: ${euiTheme.size.m};
    align-items: start;
    @media (max-width: ${euiTheme.breakpoint.m}px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `;

  const statsRowLayoutCss = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: ${euiTheme.size.l};
    align-items: stretch;
  `;

  const statsRowCellCss = css`
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  `;

  return (
    <>
      <EuiPageBody restrictWidth={false}>
        <EuiPageTemplate.Header
          bottomBorder={false}
          paddingSize="none"
          data-test-subj="managementLandingHeader"
          restrictWidth={false}
          css={css`
            background: transparent;
            width: 100%;
            max-width: none;
            box-sizing: border-box;
          `}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h2>
                  {clusterNameTitle ? (
                    clusterNameTitle
                  ) : (
                    <FormattedMessage
                      id="management.landing.headerTitleFallback"
                      defaultMessage="Stack Management"
                    />
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ManagementLandingHealthBadge status={envHealth?.healthStatus} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        {envLoadState === 'error' ? (
          <EuiPanel
            hasBorder
            paddingSize="m"
            data-test-subj="managementEnvironmentHealthBarError"
            role="alert"
            css={css`
              margin-top: ${euiTheme.size.m};
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="errorFilled" color="danger" size="l" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiTitle size="xs">
                    <h3
                      css={css`
                        margin-block: 0;
                      `}
                    >
                      <FormattedMessage
                        id="management.landing.envHealth.loadErrorTitle"
                        defaultMessage="Could not load environment health"
                      />
                    </h3>
                  </EuiTitle>
                  <EuiText size="s" color="subdued">
                    <FormattedMessage
                      id="management.landing.envHealth.loadErrorBody"
                      defaultMessage="Try refreshing the page. If the problem persists, contact your administrator."
                    />
                  </EuiText>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ) : null}
        <div
          css={css`
            margin-top: ${euiTheme.size.l};
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.m};
          `}
          data-test-subj="managementLandingMainColumn"
        >
          <div css={statsRowLayoutCss} data-test-subj="managementLandingStatsAndCalloutsRow">
            <div css={statsRowCellCss}>
              <ManagementLandingHeaderDescription
                loadState={envLoadState}
                data={envHealth}
                capabilities={coreStart.application.capabilities}
                navigateToApp={coreStart.application.navigateToApp}
              />
            </div>
          </div>
          <UpgradeAssistantBanner
            http={coreStart.http}
            navigateToApp={coreStart.application.navigateToApp}
          />
          <div
            css={twoColumnLandingGridCss}
            data-test-subj="managementLandingQuickActionsAndSettingsRow"
          >
            <div
              css={css`
                min-width: 0;
              `}
            >
              <QuickActionsGrid
                capabilities={coreStart.application.capabilities}
                navigateToApp={coreStart.application.navigateToApp}
              />
            </div>
            <div
              css={css`
                min-width: 0;
              `}
            >
              <ManagementLandingSettingsPanel
                capabilities={coreStart.application.capabilities}
                navigateToApp={coreStart.application.navigateToApp}
                uiSettings={coreStart.uiSettings}
              />
            </div>
          </div>
          <ManagementLandingWorkflowPaths
            capabilities={coreStart.application.capabilities}
            navigateToApp={coreStart.application.navigateToApp}
          />
          <EuiSpacer size="m" />
          <ManagementLandingDocsFooter docLinks={coreStart.docLinks} />
        </div>
        {shouldShowAutoOpsPromotion ? (
          <div
            css={css`
              max-width: 600px;
              margin-top: ${euiTheme.size.l};
            `}
          >
            <AutoOpsPromotionCallout
              cloudConnectUrl={cloudConnectUrl}
              onConnectClick={handleConnectClick}
              hasCloudConnectPermission={hasCloudConnectPermission}
              overrideCalloutProps={{ style: { margin: 0 } }}
            />
          </div>
        ) : null}
      </EuiPageBody>
    </>
  );
}

export const ManagementLandingPage = ({
  setBreadcrumbs,
  onAppMounted,
}: ManagementLandingPageProps) => {
  const { appBasePath, sections, kibanaVersion, cardsNavigationConfig, chromeStyle, coreStart } =
    useAppContext();
  setBreadcrumbs();

  const managementQuickActionsGrid = (
    <QuickActionsGrid
      capabilities={coreStart.application.capabilities}
      navigateToApp={coreStart.application.navigateToApp}
    />
  );

  const { loadState: envLoadState, data: envHealth } = useManagementEnvironmentHealth(
    coreStart.http
  );

  useEffect(() => {
    const fallback = i18n.translate('management.landing.headerTitleFallback', {
      defaultMessage: 'Stack Management',
    });

    if (envLoadState !== 'ready') {
      coreStart.chrome.docTitle.change(fallback);
      return;
    }

    const name = envHealth?.clusterName?.trim();
    coreStart.chrome.docTitle.change(name && name.length > 0 ? name : fallback);
  }, [coreStart.chrome.docTitle, envLoadState, envHealth?.clusterName]);

  useEffect(() => {
    return () => {
      coreStart.chrome.docTitle.reset();
    };
  }, [coreStart.chrome.docTitle]);

  useEffect(() => {
    onAppMounted('home');
  }, [onAppMounted]);

  if (cardsNavigationConfig?.enabled) {
    return (
      <EuiPageBody restrictWidth={true} data-test-subj="cards-navigation-page">
        {managementQuickActionsGrid}
        <EuiSpacer size="l" />
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
      <>
        <SolutionEmptyPrompt kibanaVersion={kibanaVersion} coreStart={coreStart} />
        <EuiPageBody restrictWidth={true} paddingSize="l">
          {managementQuickActionsGrid}
        </EuiPageBody>
      </>
    );
  }

  return <ManagementLandingClassicBody envLoadState={envLoadState} envHealth={envHealth} />;
};
