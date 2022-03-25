/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { ElasticAgentCard } from './no_data_card';
import { NoDataPageBody } from './no_data_page_body';
import { NoDataPageProps } from './types';

export const NoDataPage: FunctionComponent<NoDataPageProps> = ({
  solution,
  logo,
  action,
  docsLink,
  pageTitle,
  ...rest
}) => {
  const actionKeys = Object.keys(action);

  const actionCard = useMemo(() => {
    if (actionKeys.length !== 1) {
      return null;
    }
    const actionKey = actionKeys[0];
    const key =
      actionKey === 'elasticAgent' ? 'empty-page-agent-action' : `empty-page-${actionKey}-action`;
    return <ElasticAgentCard key={key} {...action[actionKey]} />;
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
        actionCard={actionCard}
        logo={logo}
        solution={solution}
        docsLink={docsLink}
      />
    </div>
  );
};
