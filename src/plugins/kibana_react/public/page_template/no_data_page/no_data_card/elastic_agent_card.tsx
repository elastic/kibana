/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  recommended,
  title,
  href,
  button,
  ...cardRest
}) => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const basePathUrl = '/plugins/kibanaReact/assets/';

  const defaultCTAtitle = i18n.translate('kibana-react.noDataPage.elasticAgentCard.title', {
    defaultMessage: 'Add Elastic Agent',
  });

  const footer =
    typeof button !== 'string' && typeof button !== 'undefined' ? (
      button
    ) : (
      // The href and/or onClick are attached to the whole Card, so the button is just for show.
      // Do not add the behavior here too or else it will propogate through
      <EuiButton fill>{button || title || defaultCTAtitle}</EuiButton>
    );

  return (
    <EuiCard
      paddingSize="l"
      href={href ?? addBasePath('/app/integrations/browse')}
      title={title || defaultCTAtitle}
      description={i18n.translate('kibana-react.noDataPage.elasticAgentCard.description', {
        defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
      })}
      image={addBasePath(`${basePathUrl}elastic_agent_card.svg`)}
      betaBadgeLabel={recommended ? NO_DATA_RECOMMENDED : undefined}
      footer={footer}
      {...(cardRest as any)}
    />
  );
};
