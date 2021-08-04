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
import { EuiButton, EuiCard, EuiCardProps } from '@elastic/eui';
import { useKibana } from '../../context';

export type ElasticAgentCardProps = Partial<EuiCardProps> & {
  solution: string;
  href: string;
  recommended?: boolean;
  buttonLabel?: string;
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const ElasticAgentCard: FunctionComponent<ElasticAgentCardProps> = ({
  solution,
  recommended = true,
  href = 'app/integrations/browse',
  buttonLabel,
  ...cardRest
}) => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const basePathUrl = '/plugins/kibanaReact/assets/';

  return (
    // @ts-ignore
    <EuiCard
      paddingSize="l"
      href={href}
      title={i18n.translate('elasticAgentCard.title', {
        defaultMessage: 'Add integrations with Elastic Agent',
      })}
      description={i18n.translate('elasticAgentCard.title', {
        defaultMessage: `The Elastic Agent provides a simple, unified way to
        collect logs, metrics, and other types of
        data from your hosts.`,
      })}
      image={addBasePath(`${basePathUrl}elastic_agent_card.svg`)}
      betaBadgeLabel={recommended ? 'Recommended' : undefined}
      footer={
        // @ts-ignore
        <EuiButton
          href={href}
          onClick={cardRest?.onClick}
          target={cardRest?.target}
          fill={recommended}
          data-test-subj={`empty-page-agent-action`}
        >
          {buttonLabel ||
            i18n.translate('elasticAgentCard.buttonLabel', {
              defaultMessage: 'Find a {solution} integration',
              values: { solution },
            })}
        </EuiButton>
      }
      {...cardRest}
    />
  );
};
