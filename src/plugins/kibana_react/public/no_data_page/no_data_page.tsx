/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './no_data_page.scss';

import React, { useMemo } from 'react';
import {
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiCardProps,
  EuiFlexGrid,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '../page_template';

import { ElasticAgentCard, ElasticBeatsCard } from './no_data_card';

type NoDataPageActions = Partial<EuiCardProps> & {
  href: string;
  recommended?: boolean;
  buttonLabel?: string;
};

export type NoDataPageActionsProps = Record<string, NoDataPageActions>;

export type NoDataPageProps = KibanaPageTemplateProps & {
  solution: string;
  logo?: string;
  actions: NoDataPageActionsProps;
  docsLink: string;
};

const NoDataPageComponent = React.memo<NoDataPageProps>(
  ({ solution, logo, actions, title, docsLink, ...rest }) => {
    // actions = sort('recommended', sort);
    const actionsKeys = Object.keys(actions);
    const renderActions = useMemo(() => {
      return Object.values(actions).map((action, i) => {
        if (actionsKeys[i] === 'elasticAgent') {
          return (
            <EuiFlexItem key={`empty-page-agent-action`}>
              {/* @ts-ignore */}
              <ElasticAgentCard solution={solution} {...action} />
            </EuiFlexItem>
          );
        } else if (actionsKeys[i] === 'beats') {
          return (
            <EuiFlexItem key={`empty-page-beats-action`}>
              {/* @ts-ignore */}
              <ElasticBeatsCard {...action} />
            </EuiFlexItem>
          );
        } else {
          return (
            <EuiFlexItem key={`empty-page-${actionsKeys[i]}-action`}>
              {/* @ts-ignore */}
              <EuiCard {...action} />
            </EuiFlexItem>
          );
        }
      });
    }, [actions, actionsKeys]);

    return (
      <KibanaPageTemplate
        restrictWidth={950}
        template="centeredBody"
        pageContentProps={{ color: 'transparent' }}
        {...rest}
      >
        <EuiText textAlign="center">
          <div className="noDataPageLogo">
            <EuiIcon type={logo || `logo${solution}`} size="xxl" />
          </div>
          <EuiSpacer />
          <h1>
            <FormattedMessage
              id="kbn.noDataPage.welcomeTitle"
              defaultMessage="Welcome to Elastic {solution}!"
              values={{ solution }}
            />
          </h1>
          <EuiTextColor color="subdued">
            <p>
              <FormattedMessage
                id="kbn.noDataPage.intro"
                defaultMessage="Add your data to get started or {link} about {solution}."
                values={{
                  solution,
                  link: (
                    <EuiLink href={docsLink}>
                      <FormattedMessage
                        id="kbn.noDataPage.intro.link"
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
        <EuiSpacer size="l" />
        <EuiFlexGrid columns={2} style={{ justifyContent: 'space-around' }}>
          {renderActions}
        </EuiFlexGrid>
        <EuiSpacer size="xxl" />
        {actionsKeys.length > 1 ? (
          <EuiText textAlign="center" color="subdued">
            <p>
              <FormattedMessage
                id="kbn.noDataPage.cantDecide"
                defaultMessage="Confused on which to use? {link}"
                values={{
                  link: (
                    <EuiLink href="https://www.elastic.co/guide/en/fleet/current/beats-agent-comparison.html">
                      <FormattedMessage
                        id="kbn.noDataPage.cantDecide.link"
                        defaultMessage="Check our docs for more information."
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        ) : undefined}
      </KibanaPageTemplate>
    );
  }
);

NoDataPageComponent.displayName = 'NoDataPageComponent';

export const NoDataPage = React.memo(NoDataPageComponent);
NoDataPage.displayName = 'NoDataPage';
