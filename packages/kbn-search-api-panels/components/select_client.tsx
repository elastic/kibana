/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanelProps,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { HttpStart } from '@kbn/core-http-browser';
import { OverviewPanel } from './overview_panel';
import './select_client.scss';

export interface SelectClientPanelProps {
  docLinks: { elasticsearchClients: string; kibanaRunApiInConsole: string };
  http: HttpStart;
  isPanelLeft?: boolean;
  overviewPanelProps?: Partial<EuiPanelProps>;
}

export const SelectClientPanel: React.FC<SelectClientPanelProps> = ({
  docLinks,
  children,
  http,
  isPanelLeft = true,
  overviewPanelProps,
}) => {
  const panelContent = (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('searchApiPanels.welcomeBanner.selectClient.heading', {
                defaultMessage: 'Choose one',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" direction="row">
        {children}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiCallOut
        title={i18n.translate('searchApiPanels.welcomeBanner.selectClient.callout.title', {
          defaultMessage: 'Try it now in Console',
        })}
        size="m"
        iconType="iInCircle"
      >
        <p>
          {i18n.translate('searchApiPanels.welcomeBanner.selectClient.callout.description', {
            defaultMessage:
              'With Console, you can get started right away with our REST API’s. No installation required. ',
          })}

          <span>
            <EuiLink target="_blank" href={http.basePath.prepend(`/app/dev_tools#/console`)}>
              {i18n.translate('searchApiPanels.welcomeBanner.selectClient.callout.link', {
                defaultMessage: 'Try Console now',
              })}
            </EuiLink>
          </span>
        </p>
      </EuiCallOut>
    </>
  );
  return (
    <OverviewPanel
      description={
        <FormattedMessage
          id="searchApiPanels.welcomeBanner.selectClient.description"
          defaultMessage="Elastic builds and maintains clients in several popular languages and our community has contributed many more. Select your favorite language client or dive into the {console} to get started."
          values={{
            console: (
              <EuiLink href={http.basePath.prepend(`/app/dev_tools#/console`)}>
                {i18n.translate(
                  'searchApiPanels.welcomeBanner.selectClient.description.console.link',
                  {
                    defaultMessage: 'Console',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      leftPanelContent={isPanelLeft ? panelContent : undefined}
      rightPanelContent={!isPanelLeft ? panelContent : undefined}
      links={[
        {
          href: docLinks.elasticsearchClients,
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.selectClient.elasticsearchClientDocLink',
            {
              defaultMessage: 'Elasticsearch clients ',
            }
          ),
        },
        {
          href: docLinks.kibanaRunApiInConsole,
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.selectClient.apiRequestConsoleDocLink',
            {
              defaultMessage: 'Run API requests in Console ',
            }
          ),
        },
      ]}
      title={i18n.translate('searchApiPanels.welcomeBanner.selectClient.title', {
        defaultMessage: 'Select your client',
      })}
      overviewPanelProps={overviewPanelProps}
    />
  );
};
