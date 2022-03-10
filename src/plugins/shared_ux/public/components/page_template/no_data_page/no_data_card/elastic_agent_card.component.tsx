/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCard, EuiTextColor } from '@elastic/eui';
import { ElasticAgentCardProps } from './types';
import { NoDataCard } from './no_data_card';
import ElasticAgentLogo from './assets/elastic_agent_card.svg';

export type ElasticAgentCardComponentProps = ElasticAgentCardProps & {
  canAccessFleet: boolean;
};

const noPermissionTitle = i18n.translate(
  'sharedUX.noDataPage.elasticAgentCard.noPermission.title',
  {
    defaultMessage: `Contact your administrator`,
  }
);

const noPermissionDescription = i18n.translate(
  'sharedUX.noDataPage.elasticAgentCard.noPermission.description',
  {
    defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
  }
);

const elasticAgentCardTitle = i18n.translate('sharedUX.noDataPage.elasticAgentCard.title', {
  defaultMessage: 'Add Elastic Agent',
});

const elasticAgentCardDescription = i18n.translate(
  'sharedUX.noDataPage.elasticAgentCard.description',
  {
    defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
  }
);

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const ElasticAgentCardComponent: FunctionComponent<ElasticAgentCardComponentProps> = ({
  canAccessFleet,
  title,
  ...cardRest
}) => {
  const noPermissionsLayout = (
    <EuiCard
      paddingSize="l"
      image={ElasticAgentLogo}
      title={<EuiTextColor color="default">{noPermissionTitle}</EuiTextColor>}
      description={<EuiTextColor color="default">{noPermissionDescription}</EuiTextColor>}
      isDisabled
    />
  );

  if (!canAccessFleet) {
    return noPermissionsLayout;
  }

  return (
    <NoDataCard
      image={ElasticAgentLogo}
      title={title || elasticAgentCardTitle}
      description={elasticAgentCardDescription}
      {...cardRest}
    />
  );
};
