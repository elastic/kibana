/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';

import { ApplicationStart } from '@kbn/core-application-browser';

import { OverlayStart } from '@kbn/core-overlays-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { I18nStart } from '@kbn/core-i18n-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { CloudStart } from '@kbn/cloud-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { css } from '@emotion/react';
import { GuideId, GuideState } from '../../types';
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
  core: CoreStart;
  docLinks: DocLinksStart;
  cloudStart: CloudStart;
  shareStart: SharePluginStart;
}
export const GuideCards = (props: GuideCardsProps) => {
  const { filteredCards } = props;
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      css={css`
        @media (max-width: ${euiTheme.breakpoint.s}px) {
          max-width: 335px;
          justify-content: center;
        }
        @media (min-width: 768px) and (max-width: 1210px) {
          max-width: 230px;
          height: 175px;
          justify-content: center;
        }
      `}
    >
      <EuiFlexItem>
        <EuiFlexGroup
          css={css`
            @media (max-width: ${euiTheme.breakpoint.s}px) {
              max-width: 335px;
              justify-content: center;
            }
            @media (min-width: 768px) and (max-width: 1210px) {
              max-width: 230px;
              height: 175px;
              justify-content: center;
            }
          `}
        >
          {filteredCards?.map((card, index) => (
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
