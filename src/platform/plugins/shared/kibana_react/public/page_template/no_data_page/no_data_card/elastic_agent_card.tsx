/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { EuiButton, EuiCard, EuiTextColor, EuiScreenReaderOnly, EuiImage } from '@elastic/eui';
import { useKibana } from '../../../context';
import type { NoDataPageActions } from '../no_data_page';
import { NO_DATA_RECOMMENDED } from '../no_data_page';

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
  onClick,
  button,
  layout,
  category,
  isDisabled,
  ...cardRest
}) => {
  const {
    services: { http, application },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const imageUrl = addBasePath(`/plugins/kibanaReact/assets/elastic_agent_card.svg`);
  const canAccessFleet = application.capabilities.navLinks.integrations;
  const hasCategory = category ? `/${category}` : '';

  const image = (
    <EuiImage
      size="fullWidth"
      css={{
        width: 'max(100%, 360px)',
        height: 240,
        objectFit: 'cover',
        background: 'aliceblue',
      }}
      url={imageUrl}
      alt=""
    />
  );

  if (!canAccessFleet) {
    return (
      <EuiCard
        paddingSize="l"
        image={image}
        title={
          <EuiTextColor color="default">
            {i18n.translate('kibana-react.noDataPage.elasticAgentCard.noPermission.title', {
              defaultMessage: `Contact your administrator`,
            })}
          </EuiTextColor>
        }
        description={
          <EuiTextColor color="default">
            {i18n.translate('kibana-react.noDataPage.elasticAgentCard.noPermission.description', {
              defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
            })}
          </EuiTextColor>
        }
        isDisabled
      />
    );
  }

  const defaultCTAtitle = i18n.translate('kibana-react.noDataPage.elasticAgentCard.title', {
    defaultMessage: 'Add Elastic Agent',
  });

  const resolvedHref = href ?? addBasePath(`/app/integrations/browse${hasCategory}`);

  // The href/onClick live on the button only: a card-level href/onClick would make
  // the whole card an interactive wrapper around this button, which is invalid,
  // doubly-focusable nesting (@elastic/eui/no-nested-interactive-element).
  const footer =
    typeof button !== 'string' && typeof button !== 'undefined' ? (
      button
    ) : (
      <EuiButton fill href={resolvedHref} onClick={onClick} isDisabled={isDisabled}>
        {button || title || defaultCTAtitle}
      </EuiButton>
    );

  return (
    <EuiCard
      paddingSize="l"
      image={image}
      title={
        <EuiScreenReaderOnly>
          <span>{defaultCTAtitle}</span>
        </EuiScreenReaderOnly>
      }
      description={i18n.translate('kibana-react.noDataPage.elasticAgentCard.description', {
        defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
      })}
      betaBadgeProps={recommended ? { label: NO_DATA_RECOMMENDED } : undefined}
      footer={footer}
      layout={layout as 'vertical' | undefined}
      isDisabled={isDisabled}
      {...cardRest}
    />
  );
};
