/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import {
  EuiModal,
  EuiOverlayMask,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiCard,
  EuiIcon,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiModalBody,
  EuiModalFooter,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../../../common/ui_setting_keys';
import { AIAssistantType } from '../../../common/ai_assistant_type';
import { AssistantIcon } from '../../icons/assistant_icon/assistant_icon';

interface AIAssistantHeaderButtonProps {
  coreStart: CoreStart;
  isSecurityAIAssistantEnabled: boolean;
  isObservabilityAIAssistantEnabled: boolean;
  triggerOpenChat: (event: { assistant: AIAssistantType }) => void;
}

export const AIAssistantHeaderButton: React.FC<AIAssistantHeaderButtonProps> = ({
  coreStart,
  isSecurityAIAssistantEnabled,
  isObservabilityAIAssistantEnabled,
  triggerOpenChat,
}) => {
  const [isModalOpen, setModalOpen] = useState(false);

  const { getUrlForApp } = coreStart.application;

  const [selectedType, setSelectedType] = useState<AIAssistantType>(AIAssistantType.Default);

  const onModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedType(AIAssistantType.Default);
  }, []);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'aiAssistantModalTitle' });

  const handleOpenModal = useCallback(() => setModalOpen(true), []);
  const handleSelect = useCallback((type: AIAssistantType) => setSelectedType(type), []);

  const onApply = useCallback(() => {
    setModalOpen(false);
    coreStart.uiSettings.set(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, selectedType);
    triggerOpenChat({ assistant: selectedType });
  }, [selectedType, triggerOpenChat, coreStart.uiSettings]);

  return (
    <>
      <EuiButton
        iconType={AssistantIcon}
        onClick={handleOpenModal}
        data-test-subj="aiAssistantHeaderButton"
        aria-label={i18n.translate('aiAssistantManagementSelection.headerButton.ariaLabel', {
          defaultMessage: 'Open the AI Assistant selector',
        })}
        color="primary"
        size="s"
      >
        {i18n.translate('aiAssistantManagementSelection.headerButton.label', {
          defaultMessage: 'AI Assistant',
        })}
      </EuiButton>
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={onModalClose} aria-labelledby={modalTitleId}>
            <EuiModalHeader>
              <EuiModalHeaderTitle id={modalTitleId} data-test-subj="aiAssistantModalTitle">
                {i18n.translate('aiAssistantManagementSelection.headerButton.selectSolutionTitle', {
                  defaultMessage: 'Select an AI Assistant solution',
                })}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiText>
                <FormattedMessage
                  id="aiAssistantManagementSelection.headerButton.description"
                  defaultMessage={
                    'Choose which AI Assistant version you would like to use when navigating in Analytics and Stack Management apps. You can change this later in {genAiSettings}.'
                  }
                  values={{
                    genAiSettings: (
                      <EuiLink
                        data-test-subj="navigateToGenAISettings"
                        href={getUrlForApp('management', { path: '/ai/genAiSettings' })}
                        target="_blank"
                      >
                        <FormattedMessage
                          id="aiAssistantManagementSelection.assistants.control.navigateToGenAiSettings"
                          defaultMessage={'GenAI Settings'}
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem grow={1}>
                  <EuiCard
                    display="plain"
                    hasBorder
                    selectable={{
                      isSelected: selectedType === AIAssistantType.Observability,
                      onClick: () => handleSelect(AIAssistantType.Observability),
                    }}
                    title={i18n.translate(
                      'aiAssistantManagementSelection.headerButton.observabilityLabel',
                      {
                        defaultMessage: 'Observability and Search',
                      }
                    )}
                    titleSize="xs"
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
                    data-test-subj="aiAssistantObservabilityCard"
                    isDisabled={!isObservabilityAIAssistantEnabled}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <EuiCard
                    display="plain"
                    hasBorder
                    selectable={{
                      isSelected: selectedType === AIAssistantType.Security,
                      onClick: () => handleSelect(AIAssistantType.Security),
                    }}
                    title={i18n.translate(
                      'aiAssistantManagementSelection.headerButton.securityLabel',
                      {
                        defaultMessage: 'Security',
                      }
                    )}
                    titleSize="xs"
                    icon={<EuiIcon size="xxl" type="logoSecurity" />}
                    data-test-subj="aiAssistantSecurityCard"
                    isDisabled={!isSecurityAIAssistantEnabled}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="text"
                    onClick={onModalClose}
                    data-test-subj="aiAssistantCancelButton"
                  >
                    {i18n.translate('aiAssistantManagementSelection.headerButton.cancelLabel', {
                      defaultMessage: 'Cancel',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={onApply}
                    fill
                    isDisabled={selectedType === AIAssistantType.Default}
                    data-test-subj="aiAssistantApplyButton"
                  >
                    {i18n.translate('aiAssistantManagementSelection.headerButton.applyLabel', {
                      defaultMessage: 'Open AI Assistant',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
