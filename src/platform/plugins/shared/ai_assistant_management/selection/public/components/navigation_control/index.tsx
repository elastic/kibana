/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  EuiModal,
  EuiOverlayMask,
  EuiFlexGroup,
  EuiFlexItem,
  EuiShowFor,
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
  EuiToolTip,
} from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { isMac } from '@kbn/shared-ux-utility';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
} from '../../../common/ui_setting_keys';
import { AIAssistantType } from '../../../common/ai_assistant_type';
import type { AIExperienceSelection } from '../../types';

interface AIAssistantHeaderButtonProps {
  coreStart: CoreStart;
  isSecurityAIAssistantEnabled: boolean;
  isObservabilityAIAssistantEnabled: boolean;
  triggerOpenChat: (selection: AIExperienceSelection) => void;
}

export const AIAssistantHeaderButton: React.FC<AIAssistantHeaderButtonProps> = ({
  coreStart,
  isSecurityAIAssistantEnabled,
  isObservabilityAIAssistantEnabled,
  triggerOpenChat,
}) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

  const { getUrlForApp } = coreStart.application;
  const { toasts } = coreStart.notifications;
  const { links: docLinks } = coreStart.docLinks;

  const hasAgentBuilder = coreStart.application.capabilities.agentBuilder?.manageAgents === true;

  const [selectedType, setSelectedType] = useState<AIExperienceSelection>(AIAssistantType.Default);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const onModalClose = useCallback(() => {
    const shouldRestoreFocus = document.activeElement?.matches(':focus-visible');
    setModalOpen(false);
    setSelectedType(AIAssistantType.Default);
    if (shouldRestoreFocus) {
      requestAnimationFrame(() => buttonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = isMac ? event.metaKey : event.ctrlKey;
      if (hasModifier && (event.code === 'Semicolon' || event.key === ';')) {
        event.preventDefault();
        setModalOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const modalTitleId = useGeneratedHtmlId({ prefix: 'aiAssistantModalTitle' });

  const applySelection = useCallback(async () => {
    const chatExperience =
      selectedType === AIChatExperience.Agent ? AIChatExperience.Agent : AIChatExperience.Classic;
    const assistant =
      selectedType === AIChatExperience.Agent ? AIAssistantType.Default : selectedType;

    try {
      await Promise.all([
        coreStart.settings.client.set(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, assistant),
        coreStart.settings.client.set(PREFERRED_CHAT_EXPERIENCE_SETTING_KEY, chatExperience),
      ]);
      triggerOpenChat(selectedType);
    } catch (error) {
      toasts.addError(new Error(error.body?.message || error.message || 'Unknown error occurred'), {
        title: i18n.translate(
          'aiAssistantManagementSelection.headerButton.settingsSaveErrorTitle',
          {
            defaultMessage: 'Failed to apply AI assistant settings',
          }
        ),
      });
    }
  }, [coreStart.settings.client, selectedType, triggerOpenChat, toasts]);
  const handleConfirmAgent = useCallback(async () => {
    setConfirmModalOpen(false);
    setModalOpen(false);
    await applySelection();
  }, [applySelection]);

  const onApply = useCallback(async () => {
    if (selectedType === AIChatExperience.Agent) {
      setConfirmModalOpen(true);
    } else {
      setModalOpen(false);
      await applySelection();
    }
  }, [selectedType, applySelection]);

  const openAIAssistantLabel = i18n.translate(
    'aiAssistantManagementSelection.navControl.openAIAssistantLabel',
    {
      defaultMessage: 'Open AI Assistant',
    }
  );
  const shortcutLabel = i18n.translate(
    'aiAssistantManagementSelection.navControl.keyboardShortcutTooltip',
    {
      values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
      defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
    }
  );
  const tooltipRef = useRef<EuiToolTip>(null);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  const fullTooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <span>{openAIAssistantLabel}</span>
      <br />
      <span>{shortcutLabel}</span>
    </div>
  );

  const handleButtonClick = () => {
    tooltipRef.current?.hideToolTip();
    setTooltipVisible(false);
    setModalOpen(true);
  };

  const textButton = (
    <AiButton
      buttonRef={buttonRef}
      onClick={handleButtonClick}
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
      iconType="aiAssistantLogo"
      variant="base"
      size="s"
      data-test-subj="aiAssistantHeaderButton"
    >
      <FormattedMessage
        id="aiAssistantManagementSelection.headerButton.label"
        defaultMessage="AI Assistant"
      />
    </AiButton>
  );

  const iconButton = (
    <AiButton
      buttonRef={buttonRef}
      iconOnly
      iconType="aiAssistantLogo"
      onClick={handleButtonClick}
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
      aria-label={openAIAssistantLabel}
      variant="base"
      size="s"
      data-test-subj="aiAssistantHeaderButtonIcon"
    />
  );
  return (
    <>
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        {tooltipVisible ? (
          <EuiToolTip content={shortcutLabel} ref={tooltipRef}>
            {textButton}
          </EuiToolTip>
        ) : (
          textButton
        )}
      </EuiShowFor>
      <EuiShowFor sizes={['xs', 's']}>
        {tooltipVisible ? (
          <EuiToolTip content={fullTooltipContent} ref={tooltipRef}>
            {iconButton}
          </EuiToolTip>
        ) : (
          iconButton
        )}
      </EuiShowFor>
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={onModalClose} aria-labelledby={modalTitleId}>
            <EuiModalHeader>
              <EuiModalHeaderTitle id={modalTitleId} data-test-subj="aiAssistantModalTitle">
                {i18n.translate(
                  'aiAssistantManagementSelection.headerButton.selectAIChatExperienceTitle',
                  {
                    defaultMessage: 'Select a chat experience',
                  }
                )}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiText>
                <FormattedMessage
                  id="aiAssistantManagementSelection.headerButton.description"
                  defaultMessage={
                    'Choose which chat experience to use throughout Kibana. {learnMoreLink}. <bold>This setting applies to all users in the space.</bold> To change it later, go to {genAiSettings}.'
                  }
                  values={{
                    bold: (str) => <strong>{str}</strong>,
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
                    learnMoreLink: (
                      <EuiLink
                        href={docLinks.agentBuilder.learnMore}
                        target="_blank"
                        data-test-subj="aiAgentBuilderLearnMoreLink"
                      >
                        <FormattedMessage
                          id="aiAssistantManagementSelection.headerButton.learnMoreLink"
                          defaultMessage="Learn more"
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
                      onClick: () => setSelectedType(AIAssistantType.Observability),
                    }}
                    title={i18n.translate(
                      'aiAssistantManagementSelection.headerButton.observabilityLabel',
                      {
                        defaultMessage: 'Observability and Search AI Assistant',
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
                          <EuiIcon size="xxl" type="logoObservability" aria-hidden={true} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiIcon size="xxl" type="logoEnterpriseSearch" aria-hidden={true} />
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
                      onClick: () => setSelectedType(AIAssistantType.Security),
                    }}
                    title={i18n.translate(
                      'aiAssistantManagementSelection.headerButton.securityLabel',
                      {
                        defaultMessage: 'Security AI Assistant',
                      }
                    )}
                    titleSize="xs"
                    icon={<EuiIcon size="xxl" type="logoSecurity" aria-hidden={true} />}
                    data-test-subj="aiAssistantSecurityCard"
                    isDisabled={!isSecurityAIAssistantEnabled}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <EuiCard
                    display="plain"
                    hasBorder
                    selectable={{
                      isSelected: selectedType === AIChatExperience.Agent,
                      onClick: () => setSelectedType(AIChatExperience.Agent),
                    }}
                    title={i18n.translate(
                      'aiAssistantManagementSelection.headerButton.aiAgentLabel',
                      {
                        defaultMessage: 'AI Agent',
                      }
                    )}
                    titleSize="xs"
                    icon={<EuiIcon type="productAgent" size="xxl" aria-hidden={true} />}
                    data-test-subj="aiAssistantAgentCard"
                    isDisabled={!hasAgentBuilder}
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
                      defaultMessage: 'Continue',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}

      {isConfirmModalOpen && (
        <AIAgentConfirmationModal
          onConfirm={handleConfirmAgent}
          onCancel={() => setConfirmModalOpen(false)}
          docLinks={docLinks}
        />
      )}
    </>
  );
};
