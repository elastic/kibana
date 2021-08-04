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

export type ElasticBeatsCardProps = Partial<EuiCardProps> & {
  href: string;
  recommended?: boolean;
  buttonLabel?: string;
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const ElasticBeatsCard: FunctionComponent<ElasticBeatsCardProps> = ({
  recommended,
  href = 'app/home#/tutorial',
  buttonLabel,
  ...cardRest
}) => {
  const {
    services: { http, uiSettings },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const basePathUrl = '/plugins/kibanaReact/assets/';
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  return (
    // @ts-ignore
    <EuiCard
      paddingSize="l"
      href={href}
      title={i18n.translate('elasticBeatsCard.title', {
        defaultMessage: 'Add data with Beats',
      })}
      description={i18n.translate('elasticBeatsCard.title', {
        defaultMessage: `While Agent is the best we have to offer, we are still
        adding features. If Elastic Agent is missing a feature
        you need, use Beats instead.`,
      })}
      image={addBasePath(
        `${basePathUrl}elastic_beats_card_${IS_DARK_THEME ? 'dark' : 'light'}.svg`
      )}
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
            i18n.translate('elasticBeatsCard.buttonLabel', {
              defaultMessage: 'Setup Beats',
            })}
        </EuiButton>
      }
      {...cardRest}
    />
  );
};
