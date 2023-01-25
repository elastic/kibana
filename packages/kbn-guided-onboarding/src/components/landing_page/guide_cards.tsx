/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { ApplicationStart } from '@kbn/core-application-browser';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { GuideId } from '../../types';
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

export type GuideCardSolutions = 'search' | 'observability' | 'security';

export interface GuideCardsProps {
  isLoading: boolean;
  activateGuide: (guideId: GuideId) => Promise<void>;
  navigateToApp: ApplicationStart['navigateToApp'];
  activeFilter: GuideFilterValues;
}
export const GuideCards = ({
  isLoading,
  activateGuide,
  navigateToApp,
  activeFilter,
}: GuideCardsProps) => {
  return (
    <EuiFlexGroup wrap responsive justifyContent="center">
      {guideCards.map((card, index) => {
        const onClick = async () => {
          if (card.guideId) {
            await activateGuide(card.guideId);
          } else if (card.navigateTo) {
            await navigateToApp(card.navigateTo?.appId, {
              path: card.navigateTo.path,
            });
          }
        };
        const isHighlighted = activeFilter === 'all' || activeFilter === card.solution;
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
            />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
