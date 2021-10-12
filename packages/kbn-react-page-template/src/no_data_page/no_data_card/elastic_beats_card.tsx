/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCard } from '@elastic/eui';
import { NoDataPageActions, NO_DATA_RECOMMENDED } from '../no_data_page';
import { KibanaContext } from '../../page_template';

export type ElasticBeatsCardProps = KibanaContext &
  NoDataPageActions & {
    solution: string;
  };

export const ElasticBeatsCard: FunctionComponent<ElasticBeatsCardProps> = ({
  recommended,
  title,
  button,
  href,
  solution, // unused for now
  layout,
  isDarkMode,
  addBasePath,
  ...cardRest
}) => {
  const defaultCTAtitle = i18n.translate(
    'kbn-react-page-template.noDataPage.elasticBeatsCard.title',
    {
      defaultMessage: 'Add data',
    }
  );

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
      href={href ?? addBasePath('/app/home#/tutorial_directory')}
      title={title || defaultCTAtitle}
      description={i18n.translate(
        'kbn-react-page-template.noDataPage.elasticBeatsCard.description',
        {
          defaultMessage: `Use Beats to add data from various systems to Elasticsearch.`,
        }
      )}
      image={
        isDarkMode
          ? require('../../assets/elastic_beats_card_dark.svg')
          : require('../../assets/elastic_beats_card_light.svg')
      }
      betaBadgeLabel={recommended ? NO_DATA_RECOMMENDED : undefined}
      footer={footer}
      layout={layout as 'vertical' | undefined}
      {...cardRest}
    />
  );
};
