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
import { useKibana } from '../../context';
import { NoDataPageActions, NO_DATA_RECOMMENDED } from '../no_data_page';

export const ElasticBeatsCard: FunctionComponent<NoDataPageActions> = ({
  recommended,
  href = 'app/home#/tutorial',
  button,
  ...cardRest
}) => {
  const {
    services: { http, uiSettings },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const basePathUrl = '/plugins/kibanaReact/assets/';
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const footer =
    typeof button !== 'string' && typeof button !== 'undefined' ? (
      button
    ) : (
      <EuiButton
        href={href}
        onClick={cardRest?.onClick}
        target={cardRest?.target}
        fill={recommended}
      >
        {button ||
          i18n.translate('elasticBeatsCard.buttonLabel', {
            defaultMessage: 'Setup Beats',
          })}
      </EuiButton>
    );

  return (
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
      betaBadgeLabel={recommended ? NO_DATA_RECOMMENDED : undefined}
      footer={footer}
      {...(cardRest as any)}
    />
  );
};
