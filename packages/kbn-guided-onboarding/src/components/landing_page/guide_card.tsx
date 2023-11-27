/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EndpointsModal } from '@kbn/cloud-links-plugin/public';
import { GuideState } from '../../types';
import { GuideCardConstants } from './guide_cards.constants';
import { GuideCardsProps } from './guide_cards';

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
  core,
  docLinks,
  cloudStart,
  shareStart,
}: GuideCardsProps & { card: GuideCardConstants }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  let guideState: GuideState | undefined;
  if (card.guideId) {
    guideState = guidesState.find((state) => state.guideId === card.guideId);
  }

  const openESApiModal = useCallback(() => {
    const session = openModal(
      toMountPoint(
        <EndpointsModal
          closeModal={() => session.close()}
          core={core}
          docLinks={docLinks}
          cloud={cloudStart}
          share={shareStart}
        />,
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
  }, [card.title, i18nStart, openModal, theme]);

  const onClick = useCallback(async () => {
    setIsLoading(true);
    if (card.guideId) {
      await activateGuide(card.guideId, guideState);
    } else if (card.navigateTo) {
      await navigateToApp(card.navigateTo?.appId, {
        path: card.navigateTo.path,
      });
    } else if (card.openModal) {
      openESApiModal();
    }
    setIsLoading(false);
  }, [
    activateGuide,
    card.guideId,
    card.navigateTo,
    guideState,
    navigateToApp,
    card.openModal,
    openESApiModal,
  ]);

  const isHighlighted = activeFilter === card.solution;
  const isComplete = guideState && guideState.status === 'complete';
  const progress = getProgressLabel(guideState);

  const cardCss = css`
    position: relative;
    height: 125px;
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
      height: 175px;
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
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              justifyContent="center"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color={euiTheme.colors.success} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <small>
                  {i18n.translate('guidedOnboardingPackage.gettingStarted.cards.completeLabel', {
                    defaultMessage: 'Guide complete',
                  })}
                </small>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      }
    />
  );
};
