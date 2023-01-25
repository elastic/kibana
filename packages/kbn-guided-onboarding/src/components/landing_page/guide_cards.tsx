/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTextColor } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ApplicationStart } from '@kbn/core-application-browser';

import { GuideId, GuideState } from '../../types';
import { GuideFilterValues } from './guide_filters';
import { guideCards } from './guide_cards.constants';

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
  if (numberCompleteSteps < 1) {
    return undefined;
  }
  return i18n.translate('guidedOnboardingPackage.gettingStarted.cards.progressLabel', {
    defaultMessage: '{progress} steps complete',
    values: {
      progress: `${numberCompleteSteps}/${numberSteps}`,
    },
  });
};

export type GuideCardSolutions = 'search' | 'observability' | 'security';

export interface GuideCardsProps {
  isLoading: boolean;
  activateGuide: (guideId: GuideId, guideState?: GuideState) => Promise<void>;
  navigateToApp: ApplicationStart['navigateToApp'];
  activeFilter: GuideFilterValues;
  guidesState: GuideState[];
}
export const GuideCards = ({
  isLoading,
  activateGuide,
  navigateToApp,
  activeFilter,
  guidesState,
}: GuideCardsProps) => {
  return (
    <EuiFlexGroup wrap responsive justifyContent="center">
      {guideCards.map((card, index) => {
        let guideState: GuideState | undefined;
        if (card.guideId) {
          guideState = guidesState.find((state) => state.guideId === card.guideId);
        }
        const onClick = async () => {
          if (card.guideId) {
            await activateGuide(card.guideId, guideState);
          } else if (card.navigateTo) {
            await navigateToApp(card.navigateTo?.appId, {
              path: card.navigateTo.path,
            });
          }
        };
        const isHighlighted = activeFilter === 'all' || activeFilter === card.solution;
        const isComplete = guideState && guideState.status === 'complete';
        const progress = isComplete ? undefined : getProgressLabel(guideState);
        return (
          <EuiFlexItem key={index} grow={false}>
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
                          {i18n.translate(
                            'guidedOnboardingPackage.gettingStarted.cards.completeLabel',
                            {
                              defaultMessage: 'Guide complete',
                            }
                          )}
                        </small>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </>
              }
            />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
