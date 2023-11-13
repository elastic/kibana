/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useCreateKnowledgeBaseEntry } from '../../hooks/use_create_knowledge_base_entry';

export function KnowledgeBaseNewManualEntryFlyout({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isLoading } = useCreateKnowledgeBaseEntry();

  const [newEntryId, setNewEntryId] = useState('');
  const [newEntryText, setNewEntryText] = useState('');

  const handleSubmitNewEntryClick = async () => {
    try {
      await mutateAsync({
        entry: {
          id: newEntryId,
          text: newEntryText,
          confidence: 'high',
          is_correction: false,
          public: true,
          labels: {},
        },
      });
      onClose();
    } catch (_) {
      /* empty */
    }
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'aiAssistantManagementObservabilityknowledgeBaseNewEntryFlyout.h2.newEntryLabel',
              {
                defaultMessage: 'New entry',
              }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          <strong>
            {i18n.translate(
              'aiAssistantManagementObservability.knowledgeBaseNewManualEntryFlyout.strong.idLabel',
              { defaultMessage: 'ID' }
            )}
          </strong>
        </EuiText>

        <EuiFieldText value={newEntryId} onChange={(e) => setNewEntryId(e.target.value)} />

        <EuiSpacer size="l" />

        <EuiText>
          <strong>
            {i18n.translate(
              'aiAssistantManagementObservability.knowledgeBaseNewManualEntryFlyout.strong.contentsLabel',
              { defaultMessage: 'Contents' }
            )}
          </strong>
        </EuiText>

        <EuiSpacer size="l" />
        <EuiMarkdownEditor
          aria-label={i18n.translate(
            'aiAssistantManagementObservability.knowledgeBaseNewManualEntryFlyout.euiMarkdownEditor.observabilityAiAssistantKnowledgeBaseViewMarkdownEditorLabel',
            { defaultMessage: 'observabilityAiAssistantKnowledgeBaseViewMarkdownEditor' }
          )}
          height={400}
          initialViewMode="editing"
          readOnly={false}
          placeholder="Enter contents"
          value={newEntryText}
          onChange={(text) => setNewEntryText(text)}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty disabled={isLoading} onClick={onClose}>
              {i18n.translate(
                'aiAssistantManagementObservability.knowledgeBaseNewManualEntryFlyout.cancelButtonEmptyLabel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill isLoading={isLoading} onClick={handleSubmitNewEntryClick}>
              {i18n.translate(
                'aiAssistantManagementObservability.knowledgeBaseNewManualEntryFlyout.saveButtonLabel',
                { defaultMessage: 'Save' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
