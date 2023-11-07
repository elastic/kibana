/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
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
import { useAppContext } from '../../app_context';

export function AiAssistantSelectionPage() {
  const { setBreadcrumbs, navigateToApp } = useAppContext();

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('aiAssistantManagement.breadcrumb.index', {
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

      <EuiFlexGrid columns={2}>
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
            title={i18n.translate(
              'aiAssistantManagement.aiAssistantSelectionPage.observabilityLabel.',
              { defaultMessage: 'Elastic AI Assistant for Observability' }
            )}
            titleSize="xs"
            onClick={() =>
              navigateToApp('management', { path: 'kibana/aiAssistantManagementObservability' })
            }
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
            href={'/security'}
            icon={<EuiIcon size="l" type="logoSecurity" />}
            layout="horizontal"
            title={i18n.translate('aiAssistantManagement.aiAssistantSelectionPage.securityLabel', {
              defaultMessage: 'Elastic AI Assistant for Security',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
}
