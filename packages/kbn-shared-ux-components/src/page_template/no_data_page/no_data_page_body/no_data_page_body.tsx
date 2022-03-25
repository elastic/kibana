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
import { NoDataPageProps } from '../types';
import { ElasticAgentCard } from '../no_data_card';
import { KibanaSolutionAvatar } from '../../../solution_avatar';

export type NoDataPageBodyProps = {
  actionCard: ReactElement<typeof ElasticAgentCard> | null;
} & Omit<NoDataPageProps, 'action'>;

export const NoDataPageBody = (props: NoDataPageBodyProps) => {
  const { pageTitle, docsLink, solution, actionCard, logo } = props;

  return (
    <>
      <EuiText textAlign="center">
        <KibanaSolutionAvatar name={solution} iconType={logo || `logo${solution}`} size="xxl" />
        <EuiSpacer size="l" />
        <h1>{pageTitle}</h1>
        <EuiTextColor color="subdued">
          <p>
            <FormattedMessage
              id="sharedUXComponents.noDataPage.intro"
              defaultMessage="Add your data to get started, or {link} about {solution}."
              values={{
                solution,
                link: (
                  <EuiLink href={docsLink}>
                    <FormattedMessage
                      id="sharedUXComponents.noDataPage.intro.link"
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
      {actionCard}
    </>
  );
};
