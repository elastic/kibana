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

import type { ApplicationStart } from '@kbn/core-application-browser';

import { GuideId, GuideState } from '../../../types';
import { GuideFilterValues } from './guide_filters';
import { GuideCardConstants } from './guide_cards.constants';
import { GuideCard } from './guide_card';

export type GuideCardSolutions = 'search' | 'observability' | 'security';

export interface GuideCardsProps {
  activateGuide: (guideId: GuideId, guideState?: GuideState) => Promise<void>;
  navigateToApp: ApplicationStart['navigateToApp'];
  activeFilter: GuideFilterValues;
  guidesState: GuideState[];
  filteredCards?: GuideCardConstants[];
}
export const GuideCards = (props: GuideCardsProps) => {
  const { filteredCards } = props;
  return (
    <EuiFlexGroup wrap alignItems="center" justifyContent="center">
      {filteredCards?.map((card, index) => (
        <EuiFlexItem key={index}>
          <GuideCard card={card} {...props} />
          <EuiSpacer size="m" />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
