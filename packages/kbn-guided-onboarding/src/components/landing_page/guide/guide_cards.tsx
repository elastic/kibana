/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import type { ApplicationStart } from '@kbn/core-application-browser';

import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { BrowserUrlService } from '@kbn/share-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
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
  openModal: OverlayStart['openModal'];
  theme: ThemeServiceStart;
  i18nStart: I18nStart;
  url: BrowserUrlService;
  cloud: CloudSetup;
  docLinks: CoreStart['docLinks'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
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
