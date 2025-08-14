/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
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
  const {
    capabilities,
    setBreadcrumbs,
    navigateToApp,
    buildFlavor,
    kibanaBranch,
    securityAIAssistantEnabled,
  } = useAppContext();
  const aiAssistantManagementSelection = capabilities.management.ai.aiAssistantManagementSelection;

  const observabilityAIAssistantEnabled = capabilities.observabilityAIAssistant?.show;
  const securityAIAssistantVisibility = Boolean(
    capabilities.securitySolutionAssistant['ai-assistant']
  );
  const isSecurityAIAssistantEnabled =
    securityAIAssistantEnabled && aiAssistantManagementSelection && securityAIAssistantVisibility;

  const observabilityDoc = getDocLinks({ buildFlavor, kibanaBranch }).observability.aiAssistant;
  const securityDoc = getDocLinks({ buildFlavor, kibanaBranch }).securitySolution.aiAssistant;

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('aiAssistantManagementSelection.breadcrumb.index', {
          defaultMessage: 'AI Assistants',
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
              defaultMessage: 'AI Assistants',
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
                        path: 'ai/observabilityAiAssistantManagement',
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
            icon={
              <EuiFlexGroup
                gutterSize="m"
                alignItems="center"
                responsive={false}
                direction="row"
                justifyContent="center"
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xxl" type="logoObservability" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xxl" type="logoEnterpriseSearch" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            isDisabled={!observabilityAIAssistantEnabled}
            title={i18n.translate(
              'aiAssistantManagementSelection.aiAssistantSelectionPage.observabilityLabel',
              { defaultMessage: 'Elastic AI Assistant for Observability and Search' }
            )}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiCard
            description={
              <div>
                {!isSecurityAIAssistantEnabled ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiCallOut
                      iconType="warning"
                      data-test-subj="pluginsAiAssistantSelectionPageSecurityDocumentationCallout"
                      title={i18n.translate(
                        'aiAssistantManagementSelection.aiAssistantSelectionPage.securityAi.thisFeatureIsDisabledCallOutLabel',
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
                {isSecurityAIAssistantEnabled && (
                  <EuiButton
                    data-test-subj="pluginsAiAssistantSelectionSecurityPageButton"
                    iconType="gear"
                    onClick={() =>
                      navigateToApp('management', { path: 'ai/securityAiAssistantManagement' })
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
            isDisabled={!isSecurityAIAssistantEnabled}
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
