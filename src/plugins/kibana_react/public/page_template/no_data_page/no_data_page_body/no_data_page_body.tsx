/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLink, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';
import React, { ReactElement } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataPageProps } from '../no_data_page';
import { KibanaPageTemplateSolutionNavAvatar } from '../../solution_nav';
import { ActionCards } from '../action_cards';
import { ElasticAgentCard, NoDataCard } from '../no_data_card';

type NoDataPageBodyProps = {
  actionCards: Array<ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>>;
} & Omit<NoDataPageProps, 'actions'>;

export const NoDataPageBody = (props: NoDataPageBodyProps) => {
  const { pageTitle, docsLink, solution, actionCards, logo } = props;

  return (
    <>
      <EuiText textAlign="center">
        <KibanaPageTemplateSolutionNavAvatar
          name={solution}
          iconType={logo || `logo${solution}`}
          size="xxl"
        />
        <EuiSpacer size="l" />
        <h1>{pageTitle}</h1>
        <EuiTextColor color="subdued">
          <p>
            <FormattedMessage
              id="kibana-react.noDataPage.intro"
              defaultMessage="Add your data to get started, or {link} about {solution}."
              values={{
                solution,
                link: (
                  <EuiLink href={docsLink}>
                    <FormattedMessage
                      id="kibana-react.noDataPage.intro.link"
                      defaultMessage="learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiTextColor>
      </EuiText>
      <EuiSpacer size="xxl" />
      <ActionCards actionCards={actionCards} />
    </>
  );
};
