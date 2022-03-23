/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { ElasticAgentCard, NoDataCard } from './no_data_card';
import { NoDataPageBody } from './no_data_page_body';
import { NoDataPageProps } from './types';

export const NO_DATA_RECOMMENDED = i18n.translate(
  'sharedUXComponents.noDataPage.noDataPage.recommended',
  {
    defaultMessage: 'Recommended',
  }
);

export const NoDataPage: FunctionComponent<NoDataPageProps> = ({
  solution,
  logo,
  action,
  docsLink,
  pageTitle,
  ...rest
}) => {
  const actionKeys = Object.keys(action);

  const actionCards = useMemo(() => {
    return actionKeys.map((actionKey) => {
      const isAgent = actionKey === 'elasticAgent';
      const key = isAgent ? 'empty-page-agent-action' : `empty-page-${actionKey}-action`;
      return isAgent ? (
        <ElasticAgentCard key={key} {...action[actionKey]} />
      ) : (
        <NoDataCard key={key} {...action[actionKey]} />
      );
    });
  }, [action, actionKeys]);

  const title =
    pageTitle ||
    i18n.translate('sharedUXComponents.noDataPage.welcomeTitle', {
      defaultMessage: 'Welcome to Elastic {solution}!',
      values: { solution },
    });

  return (
    <div {...rest}>
      <NoDataPageBody
        pageTitle={title}
        actionCard={actionCards.length > 0 ? actionCards[0] : null}
        logo={logo}
        solution={solution}
        docsLink={docsLink}
      />
    </div>
  );
};
