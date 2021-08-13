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

export type ElasticBeatsCardProps = NoDataPageActions & {
  solution: string;
};

export const ElasticBeatsCard: FunctionComponent<ElasticBeatsCardProps> = ({
  recommended,
  href = 'app/home#/tutorial',
  button,
  solution,
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
      <EuiButton href={href} onClick={cardRest?.onClick} target={cardRest?.target} fill>
        {button ||
          i18n.translate('kibana-react.noDataPage.elasticBeatsCard.buttonLabel', {
            defaultMessage: 'Install Beats for {solution}',
            values: { solution },
          })}
      </EuiButton>
    );

  return (
    <EuiCard
      paddingSize="l"
      href={href}
      title={i18n.translate('kibana-react.noDataPage.elasticBeatsCard.title', {
        defaultMessage: 'Add data with Beats',
      })}
      description={i18n.translate('kibana-react.noDataPage.elasticBeatsCard.description', {
        defaultMessage: `
            Beats send data from hundreds or thousands of machines and systems to Logstash or Elasticsearch.`,
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
