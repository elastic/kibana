/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, FunctionComponent } from 'react';
import classNames from 'classnames';

import { EuiLink, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';

import { ElasticAgentCard } from './no_data_card';
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
    <div
      className={classNames('kbnNoDataPageContents', rest.className)}
      data-test-subj="kbnNoDataPage"
    >
      <EuiText textAlign="center">
        <KibanaSolutionAvatar name={solution} iconType={logo || `logo${solution}`} size="xxl" />
        <EuiSpacer size="l" />
        <h1>{title}</h1>
        <EuiTextColor color="subdued">
          <p>
            <FormattedMessage
              id="sharedUXComponents.noDataPage.intro"
              defaultMessage="Add your data to get started, or {link} about {solution}."
              values={{
                solution,
                link: (
                  <EuiLink href={docsLink} target="_blank">
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
    </div>
  );
};
