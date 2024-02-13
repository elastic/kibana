/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useCallback, useState } from 'react';

import { EuiCard, EuiFlexGroup, EuiIcon, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import { DeploymentDetailsModal, DeploymentDetailsProvider } from '@kbn/cloud/deployment_details';
import type { ToMountPointParams } from '@kbn/react-kibana-mount';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import ReactDOM from 'react-dom';
import { GuideState } from '../../../types';
import { GuideCardConstants } from './guide_cards.constants';
import { GuideCardsProps } from './guide_cards';

const toMountPoint = (node: React.ReactNode, params: ToMountPointParams): MountPoint => {
  const mount = (element: HTMLElement) => {
    ReactDOM.render(<Fragment {...params}>{node}</Fragment>, element);
    return () => ReactDOM.unmountComponentAtNode(element);
  };

  // only used for tests and snapshots serialization
  if (process.env.NODE_ENV !== 'production') {
    mount.__reactMount__ = node;
  }

  return mount;
};

const getProgressLabel = (guideState: GuideState | undefined): string | undefined => {
  if (!guideState) {
    return undefined;
  }
  const { steps } = guideState;
  const numberSteps = steps.length;
  const numberCompleteSteps = steps.filter((step) => step.status === 'complete').length;
  if (numberCompleteSteps < 1 || numberCompleteSteps === numberSteps) {
    return undefined;
  }
  return i18n.translate('guidedOnboardingPackage.gettingStarted.cards.progressLabel', {
    defaultMessage: '{numberCompleteSteps} of {numberSteps} steps complete',
    values: {
      numberCompleteSteps,
      numberSteps,
    },
  });
};

export const GuideCard = ({
  card,
  guidesState,
  activateGuide,
  navigateToApp,
  activeFilter,
  openModal,
  i18nStart,
  theme,
  url,
  cloud,
  docLinks,
  navigateToUrl,
}: GuideCardsProps & { card: GuideCardConstants }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  let guideState: GuideState | undefined;
  if (card.guideId) {
    guideState = guidesState.find((state) => state.guideId === card.guideId);
  }

  const managementUrl = url.locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: 'security', appId: 'api_keys' });

  const openESApiModal = useCallback(() => {
    const modal = openModal(
      toMountPoint(
        <DeploymentDetailsProvider
          cloudId={cloud.isCloudEnabled ? cloud.cloudId : ''}
          elasticsearchUrl={cloud.elasticsearchUrl}
          managementUrl={managementUrl}
          apiKeysLearnMoreUrl={docLinks.links.fleet.apiKeysLearnMore}
          cloudIdLearnMoreUrl={docLinks.links.cloud.beatsAndLogstashConfiguration}
          navigateToUrl={navigateToUrl}
        >
          <DeploymentDetailsModal closeModal={() => modal.close()} />
        </DeploymentDetailsProvider>,
        {
          theme,
          i18n: i18nStart,
        }
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'guideModalESApi',
      }
    );
  }, [openModal, i18nStart, theme, cloud, docLinks, managementUrl, navigateToUrl]);

  const onClick = useCallback(async () => {
    setIsLoading(true);
    if (card.guideId) {
      await activateGuide(card.guideId, guideState);
    } else if (card.navigateTo) {
      await navigateToApp(card.navigateTo?.appId, {
        path: card.navigateTo.path,
      });
    } else if (card.openEndpointModal) {
      openESApiModal();
    }
    setIsLoading(false);
  }, [
    activateGuide,
    card.guideId,
    card.navigateTo,
    guideState,
    navigateToApp,
    card.openEndpointModal,
    openESApiModal,
  ]);

  const isHighlighted = activeFilter === card.solution;
  const isComplete = guideState && guideState.status === 'complete';
  const progress = getProgressLabel(guideState);

  const cardCss = css`
    position: relative;
    height: 150px;
    width: 380px;
    .euiCard__top {
      margin-block-end: 8px;
    }
    @media (max-width: ${euiTheme.breakpoint.s}px) {
      max-width: 335px;
      justify-content: center;
    }
    @media (min-width: 768px) and (max-width: 1210px) {
      max-width: 230px;
      height: 200px;
      justify-content: center;
    }
  `;

  return (
    <EuiCard
      // data-test-subj used for FS tracking
      data-test-subj={card.telemetryId}
      isDisabled={isLoading}
      onClick={onClick}
      css={cardCss}
      display={isHighlighted ? undefined : 'transparent'}
      hasBorder={!isHighlighted}
      title={<h3 style={{ fontWeight: 600 }}>{card.title}</h3>}
      titleSize="xs"
      icon={<EuiIcon size="l" type={card.icon} />}
      description={
        <>
          {progress && (
            <EuiTextColor color="subdued">
              <small>{progress}</small>
            </EuiTextColor>
          )}
          {isComplete && (
            <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
              <EuiIcon type="checkInCircleFilled" color={euiTheme.colors.success} />
              <small>
                {i18n.translate('guidedOnboardingPackage.gettingStarted.cards.completeLabel', {
                  defaultMessage: 'Guide complete',
                })}
              </small>
            </EuiFlexGroup>
          )}
        </>
      }
    />
  );
};
