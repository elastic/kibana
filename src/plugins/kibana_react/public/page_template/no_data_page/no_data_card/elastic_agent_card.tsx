/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { EuiButton, EuiCard } from '@elastic/eui';
import { useKibana } from '../../../context';
import { NoDataPageActions, NO_DATA_RECOMMENDED } from '../no_data_page';

export type ElasticAgentCardProps = NoDataPageActions & {
  solution: string;
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const ElasticAgentCard: FunctionComponent<ElasticAgentCardProps> = ({
  solution,
  recommended = true,
  href = 'app/integrations/browse',
  button,
  ...cardRest
}) => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const basePathUrl = '/plugins/kibanaReact/assets/';

  const footer =
    typeof button !== 'string' && typeof button !== 'undefined' ? (
      button
    ) : (
      <EuiButton href={href} onClick={cardRest?.onClick} target={cardRest?.target} fill>
        {button ||
          i18n.translate('kibana-react.noDataPage.elasticAgentCard.buttonLabel', {
            defaultMessage: 'Find an integration for {solution}',
            values: { solution },
          })}
      </EuiButton>
    );

  return (
    <EuiCard
      paddingSize="l"
      href={href}
      title={i18n.translate('kibana-react.noDataPage.elasticAgentCard.title', {
        defaultMessage: 'Add a {solution} integration',
        values: { solution },
      })}
      description={i18n.translate('kibana-react.noDataPage.elasticAgentCard.description', {
        defaultMessage: `The Elastic Agent provides a simple, unified way to
        collect data from your machines.`,
      })}
      image={addBasePath(`${basePathUrl}elastic_agent_card.svg`)}
      betaBadgeLabel={recommended ? NO_DATA_RECOMMENDED : undefined}
      footer={footer}
      {...(cardRest as any)}
    />
  );
};
