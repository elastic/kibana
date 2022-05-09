/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTextColor } from '@elastic/eui';
import { Observable } from 'rxjs';
import { ElasticAgentCardProps } from './types';
import { NoDataCard } from './no_data_card';
import ElasticAgentCardIllustration from './assets/elastic_agent_card.svg';
import { RedirectAppLinks } from '../../../redirect_app_links';

export type ElasticAgentCardComponentProps = ElasticAgentCardProps & {
  canAccessFleet: boolean;
  navigateToUrl: (url: string) => Promise<void>;
  currentAppId$: Observable<string | undefined>;
};

const noPermissionTitle = i18n.translate(
  'sharedUXComponents.noDataPage.elasticAgentCard.noPermission.title',
  {
    defaultMessage: `Contact your administrator`,
  }
);

const noPermissionDescription = i18n.translate(
  'sharedUXComponents.noDataPage.elasticAgentCard.noPermission.description',
  {
    defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
  }
);

const elasticAgentCardTitle = i18n.translate(
  'sharedUXComponents.noDataPage.elasticAgentCard.title',
  {
    defaultMessage: 'Add Elastic Agent',
  }
);

const elasticAgentCardDescription = i18n.translate(
  'sharedUXComponents.noDataPage.elasticAgentCard.description',
  {
    defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
  }
);

/**
 * Creates a specific NoDataCard pointing users to Integrations when `canAccessFleet`
 */
export const ElasticAgentCardComponent: FunctionComponent<ElasticAgentCardComponentProps> = ({
  canAccessFleet,
  title,
  navigateToUrl,
  currentAppId$,
  ...cardRest
}) => {
  const noAccessCard = (
    <NoDataCard
      image={ElasticAgentCardIllustration}
      title={<EuiTextColor color="default">{noPermissionTitle}</EuiTextColor>}
      description={<EuiTextColor color="default">{noPermissionDescription}</EuiTextColor>}
      isDisabled
      {...cardRest}
    />
  );
  const card = (
    <NoDataCard
      image={ElasticAgentCardIllustration}
      title={title || elasticAgentCardTitle}
      description={elasticAgentCardDescription}
      {...cardRest}
    />
  );

  return (
    <RedirectAppLinks navigateToUrl={navigateToUrl} currentAppId$={currentAppId$}>
      {canAccessFleet ? card : noAccessCard}
    </RedirectAppLinks>
  );
};
