/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { ApplicationStart } from '@kbn/core-application-browser';

import { GuideId, GuideState } from '../../types';
import { GuideFilterValues } from './guide_filters';
import { GuideCardConstants, guideCards } from './guide_cards.constants';
import { GuideCard } from './guide_card';

export type GuideCardSolutions = 'search' | 'observability' | 'security';

export interface GuideCardsProps {
  activateGuide: (guideId: GuideId, guideState?: GuideState) => Promise<void>;
  navigateToApp: ApplicationStart['navigateToApp'];
  activeFilter: GuideFilterValues;
  guidesState: GuideState[];
}
export const GuideCards = (props: GuideCardsProps) => {
  const { activeFilter } = props;
  const [filteredCards, setFilteredCards] = useState<any[]>([]);

  // if activeFilter changes we want to regenerate the filtered cards
  useCallback(() => {
    setFilteredCards(
      guideCards.filter((card: GuideCardConstants) => card.solution === activeFilter)
    );
  }, [activeFilter]);
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" alignItems="center">
          {filteredCards.map((card, index) => (
            <EuiFlexItem key={index} grow={false}>
              <GuideCard card={card} {...props} />
              <EuiSpacer size="m" />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
