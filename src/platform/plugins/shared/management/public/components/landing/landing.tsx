/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';

import { EuiPageBody, useEuiTheme, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { CardsNavigation } from '@kbn/management-cards-navigation';
import { AutoOpsPromotionCallout } from '@kbn/autoops-promotion-callout';

import { useAppContext } from '../management_app/management_context';
import { ClassicEmptyPrompt } from './classic_empty_prompt';
import { SolutionEmptyPrompt } from './solution_empty_prompt';

interface ManagementLandingPageProps {
  onAppMounted: (id: string) => void;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({
  setBreadcrumbs,
  onAppMounted,
}: ManagementLandingPageProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    appBasePath,
    sections,
    kibanaVersion,
    cardsNavigationConfig,
    chromeStyle,
    coreStart,
    cloud,
    hasEnterpriseLicense,
  } = useAppContext();
  setBreadcrumbs();

  // Check if cloud services are available
  const isCloudEnabled = cloud?.isCloudEnabled || false;
  // AutoOps promotion callout should only be shown for self-managed instances with an enterprise license
  const shouldShowAutoOpsPromotion = !isCloudEnabled && hasEnterpriseLicense;

  useEffect(() => {
    onAppMounted('');
  }, [onAppMounted]);

  if (cardsNavigationConfig?.enabled) {
    return (
      <EuiPageBody restrictWidth={true} data-test-subj="cards-navigation-page">
        <CardsNavigation
          sections={sections}
          appBasePath={appBasePath}
          hideLinksTo={cardsNavigationConfig?.hideLinksTo}
          extendedCardNavigationDefinitions={cardsNavigationConfig?.extendCardNavDefinitions}
        />
      </EuiPageBody>
    );
  }

  if (!chromeStyle) return null;

  if (chromeStyle === 'project') {
    return <SolutionEmptyPrompt kibanaVersion={kibanaVersion} coreStart={coreStart} />;
  }

  return (
    <EuiPageBody restrictWidth={true}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          {shouldShowAutoOpsPromotion && (
            <div
              css={css`
                max-width: 600px;
              `}
            >
              <AutoOpsPromotionCallout style={{ margin: `0 ${euiTheme.size.l}` }} />
            </div>
          )}
          <ClassicEmptyPrompt kibanaVersion={kibanaVersion} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageBody>
  );
};
