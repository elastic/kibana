/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { groupBy, keys } from 'lodash';

import type { ApplicationStart } from '@kbn/core-application-browser';

import { GuideId, GuideState } from '../../../types';
import { GuideFilterValues } from './guide_filters';
import { guideCards } from './guide_cards.constants';
import { GuideCard } from './guide_card';

export type GuideCardSolutions = 'search' | 'observability' | 'security';

export interface GuideCardsProps {
  activateGuide: (guideId: GuideId, guideState?: GuideState) => Promise<void>;
  navigateToApp: ApplicationStart['navigateToApp'];
  activeFilter: GuideFilterValues;
  guidesState: GuideState[];
}
export const GuideCards = (props: GuideCardsProps) => {
  const groupedGuideCards = groupBy(guideCards, 'solution');

  return (
    <EuiFlexGroup>
      {keys(groupedGuideCards).map((groupedGuideCard, groupIndex) => {
        const cards = groupedGuideCards[groupedGuideCard];
        return (
          <EuiFlexItem key={groupIndex}>
            <EuiFlexGroup direction="column" alignItems="center">
              {cards.map((card, index) => (
                <EuiFlexItem key={index} grow={false}>
                  <GuideCard card={card} {...props} />
                  <EuiSpacer size="m" />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
