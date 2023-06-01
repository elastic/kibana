/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useMemo, FunctionComponent, MouseEventHandler } from 'react';
import { EuiCardProps, EuiSpacer, EuiText, EuiLink, CommonProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import classNames from 'classnames';

import { ElasticAgentCard, NoDataCard } from './no_data_card';
import { NoDataPageBody } from './no_data_page_body/no_data_page_body';

export const NO_DATA_RECOMMENDED = i18n.translate(
  'kibana-react.noDataPage.noDataPage.recommended',
  {
    defaultMessage: 'Recommended',
  }
);

export type NoDataPageActions = Partial<EuiCardProps> & {
  /**
   * Applies the `Recommended` beta badge and makes the button `fill`
   */
  recommended?: boolean;
  /**
   * Provide just a string for the button's label, or a whole component
   */
  button?: string | ReactNode;
  /**
   * Remapping `onClick` to any element
   */
  onClick?: MouseEventHandler<HTMLElement>;
  /**
   * Category to auto-select within Fleet
   */
  category?: string;
};

export type NoDataPageActionsProps = Record<string, NoDataPageActions>;

export interface NoDataPageProps extends CommonProps {
  /**
   * Single name for the current solution, used to auto-generate the title, logo, description, and button label
   */
  solution: string;
  /**
   * Optionally replace the auto-generated logo
   */
  logo?: string;
  /**
   * Required to set the docs link for the whole solution
   */
  docsLink: string;
  /**
   * Optionally replace the auto-generated page title (h1)
   */
  pageTitle?: string;
  /**
   * An object of `NoDataPageActions` configurations with unique primary keys.
   * Use `elasticAgent` or `beats` as the primary key for pre-configured cards of this type.
   * Otherwise use a custom key that contains `EuiCard` props.
   */
  actions: NoDataPageActionsProps;
}

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
        <ElasticAgentCard key={key} solution={solution} {...action} />
      ) : (
        <NoDataCard key={key} {...action} />
      );
    });
  }, [actions, sortedData, actionsKeys]);

  const title =
    pageTitle ||
    i18n.translate('kibana-react.noDataPage.welcomeTitle', {
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
                id="kibana-react.noDataPage.cantDecide"
                defaultMessage="Confused on which to use? {link}"
                values={{
                  link: (
                    <EuiLink href="https://www.elastic.co/guide/en/fleet/current/beats-agent-comparison.html">
                      <FormattedMessage
                        id="kibana-react.noDataPage.cantDecide.link"
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
