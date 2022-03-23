/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, FunctionComponent } from 'react';
import { EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import classNames from 'classnames';

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
  actions,
  docsLink,
  pageTitle,
  ...rest
}) => {
  // Convert obj data into an iterable array
  const entries = Object.entries(actions);

  // This sort fn may look nonsensical, but it's some Good Ol' Javascript (TM)
  // Sort functions want either a 1, 0, or -1 returned to determine order,
  // and it turns out in JS you CAN minus booleans from each other to get a 1, 0, or -1 - e.g., (true - false == 1) :whoa:
  const sortedEntries = entries.sort(([, firstObj], [, secondObj]) => {
    // The `??` fallbacks are because the recommended key can be missing or undefined
    return Number(secondObj.recommended ?? false) - Number(firstObj.recommended ?? false);
  });

  // Convert the iterated [[key, value]] array format back into an object
  const sortedData = Object.fromEntries(sortedEntries);
  const actionsKeys = Object.keys(sortedData);

  const actionCards = useMemo(() => {
    return Object.values(sortedData).map((action, i) => {
      const isAgent = actionsKeys[i] === 'elasticAgent' || actionsKeys[i] === 'beats';
      const key = isAgent ? 'empty-page-agent-action' : `empty-page-${actionsKeys[i]}-action`;
      return isAgent ? (
        <ElasticAgentCard key={key} {...action} />
      ) : (
        <NoDataCard key={key} {...action} />
      );
    });
  }, [sortedData, actionsKeys]);

  const title =
    pageTitle ||
    i18n.translate('sharedUXComponents.noDataPage.welcomeTitle', {
      defaultMessage: 'Welcome to Elastic {solution}!',
      values: { solution },
    });

  return (
    <div {...rest} className={classNames('kbnNoDataPageContents', rest.className)}>
      <NoDataPageBody
        pageTitle={title}
        actionCards={actionCards}
        logo={logo}
        solution={solution}
        docsLink={docsLink}
      />
      {actionsKeys.length > 1 ? (
        <>
          <EuiSpacer size="xxl" />
          <EuiText textAlign="center" color="subdued">
            <p>
              <FormattedMessage
                id="sharedUXComponents.noDataPage.cantDecide"
                defaultMessage="Confused on which to use? {link}"
                values={{
                  link: (
                    <EuiLink href="https://www.elastic.co/guide/en/fleet/current/beats-agent-comparison.html">
                      <FormattedMessage
                        id="sharedUXComponents.noDataPage.cantDecide.link"
                        defaultMessage="Check our docs for more information."
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </>
      ) : undefined}
    </div>
  );
};
