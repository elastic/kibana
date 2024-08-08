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
  EuiButton,
  EuiCallOut,
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDocLinks } from '@kbn/doc-links';
import { useAppContext } from '../../app_context';

export function AiAssistantSelectionPage() {
  const { capabilities, setBreadcrumbs, navigateToApp, buildFlavor, kibanaBranch } =
    useAppContext();
  const observabilityAIAssistantEnabled = capabilities.observabilityAIAssistant?.show;
  const securityAIAssistantEnabled = capabilities.securitySolutionAssistant?.['ai-assistant'];
  const observabilityDoc = getDocLinks({ buildFlavor, kibanaBranch }).observability.aiAssistant;
  const securityDoc = getDocLinks({ buildFlavor, kibanaBranch }).securitySolution.aiAssistant;

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('aiAssistantManagementSelection.breadcrumb.index', {
          defaultMessage: 'AI Assistant',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <>
      <EuiTitle size="l" data-test-subj="pluginsAiAssistantSelectionPageTitle">
        <h2>
          {i18n.translate(
            'aiAssistantManagementSelection.aiAssistantSettingsPage.h2.aIAssistantLabel',
            {
              defaultMessage: 'AI Assistant',
            }
          )}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText data-test-subj="pluginsAiAssistantSelectionPageDescription">
        {i18n.translate(
          'aiAssistantManagementSelection.aiAssistantSettingsPage.descriptionTextLabel',
          {
            defaultMessage:
              'AI Assistants use generative AI to help your team by explaining errors, suggesting remediation, and helping you request, analyze, and visualize your data.',
          }
        )}
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={2}>
        <EuiFlexItem grow>
          <EuiCard
            data-test-subj="aiAssistantSelectionPageObservabilityCard"
            description={
              <div>
                {!observabilityAIAssistantEnabled ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiCallOut
                      iconType="warning"
                      data-test-subj="pluginsAiAssistantSelectionPageObservabilityDocumentationCallout"
                      title={i18n.translate(
                        'aiAssistantManagementSelection.aiAssistantSelectionPage.observabilityAi.thisFeatureIsDisabledCallOutLabel',
                        {
                          defaultMessage: 'This feature is disabled.',
                        }
                      )}
                      size="s"
                      className="eui-displayInlineBlock"
                    />
                    <EuiSpacer size="s" />
                  </>
                ) : null}
                <p>
                  <FormattedMessage
                    id="aiAssistantManagementSelection.aiAssistantSelectionPage.obsAssistant.documentationLinkDescription"
                    defaultMessage="For more info, refer to our {documentation}."
                    values={{
                      documentation: (
                        <EuiLink
                          data-test-subj="pluginsAiAssistantSelectionPageDocumentationLink"
                          external
                          target="_blank"
                          href={observabilityDoc}
                        >
                          {i18n.translate(
                            'aiAssistantManagementSelection.aiAssistantSelectionPage.obsAssistant.documentationLinkLabel',
                            { defaultMessage: 'documentation' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
                {observabilityAIAssistantEnabled && (
                  <EuiButton
                    iconType="gear"
                    data-test-subj="pluginsAiAssistantSelectionPageButton"
                    onClick={() =>
                      navigateToApp('management', {
                        path: 'kibana/observabilityAiAssistantManagement',
                      })
                    }
                  >
                    {i18n.translate(
                      'aiAssistantManagementSelection.aiAssistantSelectionPage.obsAssistant.manageSettingsButtonLabel',
                      { defaultMessage: 'Manage Settings' }
                    )}
                  </EuiButton>
                )}
              </div>
            }
            display="plain"
            hasBorder
            icon={<EuiIcon size="xxl" type="logoObservability" />}
            isDisabled={!observabilityAIAssistantEnabled}
            title={i18n.translate(
              'aiAssistantManagementSelection.aiAssistantSelectionPage.observabilityLabel',
              { defaultMessage: 'Elastic AI Assistant for Observability' }
            )}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiCard
            description={
              <div>
                {!securityAIAssistantEnabled ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiCallOut
                      iconType="warning"
                      data-test-subj="pluginsAiAssistantSelectionPageSecurityDocumentationCallout"
                      title={i18n.translate(
                        'aiAssistantManagementSelection.aiAssistantSelectionPage.securityAi.thisFeatureIsDisabledCallOutLabel',
                        {
                          defaultMessage:
                            'This feature is disabled. You can enable it from from Spaces > Features.',
                        }
                      )}
                      size="s"
                      className="eui-displayInlineBlock"
                    />
                    <EuiSpacer size="s" />
                  </>
                ) : null}
                <p>
                  <FormattedMessage
                    id="aiAssistantManagementSelection.aiAssistantSelectionPage.securityAssistant.documentationLinkDescription"
                    defaultMessage="For more info, refer to our {documentation}."
                    values={{
                      documentation: (
                        <EuiLink
                          data-test-subj="securityAiAssistantSelectionPageDocumentationLink"
                          external
                          target="_blank"
                          href={securityDoc}
                        >
                          {i18n.translate(
                            'aiAssistantManagementSelection.aiAssistantSettingsPage.securityAssistant.documentationLinkLabel',
                            { defaultMessage: 'documentation' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
                {securityAIAssistantEnabled && (
                  <EuiButton
                    data-test-subj="pluginsAiAssistantSelectionSecurityPageButton"
                    iconType="gear"
                    onClick={() =>
                      navigateToApp('management', { path: 'kibana/securityAiAssistantManagement' })
                    }
                  >
                    {i18n.translate(
                      'aiAssistantManagementSelection.aiAssistantSelectionPage.securityAssistant.manageSettingsButtonLabel',
                      { defaultMessage: 'Manage Settings' }
                    )}
                  </EuiButton>
                )}
              </div>
            }
            display="plain"
            hasBorder
            icon={<EuiIcon size="xxl" type="logoSecurity" />}
            isDisabled={!securityAIAssistantEnabled}
            title={i18n.translate(
              'aiAssistantManagementSelection.aiAssistantSelectionPage.securityLabel',
              { defaultMessage: 'Elastic AI Assistant for Security' }
            )}
            titleSize="xs"
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
}
