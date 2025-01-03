/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanelProps,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { OverviewPanel } from './overview_panel';
import './select_client.scss';

export interface SelectClientPanelProps {
  docLinks: { elasticsearchClients: string; kibanaRunApiInConsole: string };
  isPanelLeft?: boolean;
  overviewPanelProps?: Partial<EuiPanelProps>;
  callout?: React.ReactNode;
  application?: ApplicationStart;
  consolePlugin?: ConsolePluginStart;
  sharePlugin: SharePluginStart;
  children: React.ReactNode;
}

export const SelectClientPanel: FC<PropsWithChildren<SelectClientPanelProps>> = ({
  docLinks,
  children,
  isPanelLeft = true,
  overviewPanelProps,
  callout,
  application,
  consolePlugin,
  sharePlugin,
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
      {callout || (
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
                'With Console, you can get started right away with our REST APIs. No installation required.',
            })}

            <span>
              <TryInConsoleButton
                application={application}
                consolePlugin={consolePlugin}
                sharePlugin={sharePlugin}
                content={i18n.translate('searchApiPanels.welcomeBanner.selectClient.callout.link', {
                  defaultMessage: 'Try Console now',
                })}
              />
            </span>
          </p>
        </EuiCallOut>
      )}
    </>
  );
  return (
    <OverviewPanel
      description={
        <EuiFlexGroup direction="column" alignItems="flexStart" justifyContent="flexStart">
          <EuiFlexItem>
            <FormattedMessage
              id="searchApiPanels.welcomeBanner.selectClient.description"
              defaultMessage="Elastic builds and maintains clients in several popular languages and our community has contributed many more. Select your favorite language client or dive into the console to get started."
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <TryInConsoleButton
              application={application}
              consolePlugin={consolePlugin}
              sharePlugin={sharePlugin}
              type="button"
              showIcon={false}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
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
