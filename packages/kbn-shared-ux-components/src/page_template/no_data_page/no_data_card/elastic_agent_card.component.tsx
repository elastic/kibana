/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiImage, EuiTextColor } from '@elastic/eui';
import { ElasticAgentCardProps } from './types';
import { NoDataCard } from './no_data_card';
import ElasticAgentCardIllustration from './assets/elastic_agent_card.svg';

export type ElasticAgentCardComponentProps = ElasticAgentCardProps & {
  canAccessFleet: boolean;
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
  title = elasticAgentCardTitle,
  ...cardRest
}) => {
  const props = canAccessFleet
    ? {
        title,
        description: elasticAgentCardDescription,
      }
    : {
        title: <EuiTextColor color="default">{noPermissionTitle}</EuiTextColor>,
        description: <EuiTextColor color="default">{noPermissionDescription}</EuiTextColor>,
        isDisabled: true,
      };

  const image = (
    <EuiImage
      size="fullWidth"
      style={{
        width: 'max(100%, 360px)',
        height: 240,
        objectFit: 'cover',
        background: 'aliceblue',
      }}
      url={ElasticAgentCardIllustration}
      alt=""
    />
  );

  return <NoDataCard image={image} {...props} {...cardRest} />;
};
