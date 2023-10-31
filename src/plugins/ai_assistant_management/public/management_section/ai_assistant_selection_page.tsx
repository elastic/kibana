/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

const AiAssistantSelectionPage = ({
  coreStart,
  dataStart,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('aiAssistantManagment.breadcrumb.index', {
          defaultMessage: 'AI Assistant',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <>
      <EuiTitle size="l">
        <h2>
          {i18n.translate('aiAssistantManagement.aiAssistantSettingsPage.h2.aIAssistantLabel', {
            defaultMessage: 'AI Assistant',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText>
        {i18n.translate('aiAssistantManagement.aiAssistantSettingsPage.descriptionTextLabel', {
          defaultMessage:
            'An automated online assistant is a program that uses artificial intelligence to provide customer service or other assistance on a website.',
        })}
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={4}>
        <EuiFlexItem grow>
          <EuiCard
            description={
              <div>
                <EuiLink
                  external
                  href="https://www.elastic.co/guide/en/observability/current/obs-ai-assistant.html"
                >
                  {i18n.translate(
                    'aiAssistantManagement.aiAssistantSettingsPage.obsAssistant.documentationLinkLabel',
                    { defaultMessage: 'Documentation' }
                  )}
                </EuiLink>
              </div>
            }
            display="plain"
            hasBorder
            icon={<EuiIcon size="l" type="logoObservability" />}
            layout="horizontal"
            title={`Elastic AI Assistant for Observability`}
            titleSize="xs"
            onClick={() => {}}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            description={
              <div>
                <EuiLink
                  external
                  href="https://www.elastic.co/guide/en/security/8.9/security-assistant.html"
                >
                  {i18n.translate(
                    'aiAssistantManagement.aiAssistantSettingsPage.securityAssistant.documentationLinkLabel',
                    { defaultMessage: 'Documentation' }
                  )}
                </EuiLink>
              </div>
            }
            display="plain"
            hasBorder
            icon={<EuiIcon size="l" type="logoSecurity" />}
            layout="horizontal"
            title={`Elastic AI Assistant for Security`}
            titleSize="xs"
            onClick={() => {}}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { AiAssistantSelectionPage as default };
