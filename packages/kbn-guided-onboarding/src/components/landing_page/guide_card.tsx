/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GuideState } from '../../types';
import { GuideCardConstants } from './guide_cards.constants';
import { GuideCardsProps } from './guide_cards';

const cardCss = css`
  position: relative;
  min-height: 110px;
  width: 380px;
  .euiCard__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;

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
}: GuideCardsProps & { card: GuideCardConstants }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  let guideState: GuideState | undefined;
  if (card.guideId) {
    guideState = guidesState.find((state) => state.guideId === card.guideId);
  }

  const onClick = useCallback(async () => {
    setIsLoading(true);
    if (card.guideId) {
      await activateGuide(card.guideId, guideState);
    } else if (card.navigateTo) {
      await navigateToApp(card.navigateTo?.appId, {
        path: card.navigateTo.path,
      });
    }
    setIsLoading(false);
  }, [activateGuide, card.guideId, card.navigateTo, guideState, navigateToApp]);

  const isHighlighted = activeFilter === 'all' || activeFilter === card.solution;
  const isComplete = guideState && guideState.status === 'complete';
  const progress = getProgressLabel(guideState);
  return (
    <EuiCard
      isDisabled={isLoading}
      onClick={onClick}
      css={cardCss}
      display={isHighlighted ? undefined : 'transparent'}
      hasBorder={!isHighlighted}
      title={
        <>
          <EuiSpacer size="s" />
          <h3 style={{ fontWeight: 600 }}>{card.title}</h3>
        </>
      }
      titleSize="xs"
      betaBadgeProps={{
        label: card.solution,
      }}
      description={
        <>
          {progress && (
            <EuiTextColor color="subdued">
              <small>{progress}</small>
            </EuiTextColor>
          )}
          {isComplete && (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color="success" />
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
