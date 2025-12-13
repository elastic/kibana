/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSaveSnippet } from '../../hooks/use_saved_snippets';
import { useServicesContext } from '../../contexts';
import type { SavedSnippet } from '../../../services';

interface Props {
  currentQuery: string;
  onClose: () => void;
  onSave?: (snippet: SavedSnippet) => void;
}

export const SaveSnippetModal: React.FC<Props> = ({ currentQuery, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveSnippet = useSaveSnippet();
  const {
    services: { notifications },
  } = useServicesContext();

  const modalTitleId = useGeneratedHtmlId();

  const handleSave = async () => {
    try {
      setErrorMessage(null);
      const snippet = await saveSnippet.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        query: currentQuery,
      });

      notifications.toasts.addSuccess(
        i18n.translate('console.snippets.saveSnippetModal.successMessage', {
          defaultMessage: 'Snippet "{title}" saved successfully',
          values: { title: title.trim() },
        })
      );

      if (onSave) {
        onSave(snippet);
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : i18n.translate('console.snippets.saveSnippetModal.genericError', {
              defaultMessage: 'Failed to save snippet',
            });
      setErrorMessage(message);
    }
  };

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="console.snippets.saveSnippetModal.title"
            defaultMessage="Save snippet"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          {errorMessage && (
            <EuiFormRow fullWidth>
              <EuiCallOut
                title={i18n.translate('console.snippets.saveSnippetModal.errorTitle', {
                  defaultMessage: 'Error saving snippet',
                })}
                color="danger"
                iconType="error"
              >
                <p>{errorMessage}</p>
              </EuiCallOut>
            </EuiFormRow>
          )}
          <EuiFormRow
            label={i18n.translate('console.snippets.saveSnippetModal.nameLabel', {
              defaultMessage: 'Name',
            })}
            fullWidth
          >
            <EuiFieldText
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-test-subj="consoleSnippetTitleInput"
              placeholder={i18n.translate(
                'console.snippets.saveSnippetModal.namePlaceholder',
                {
                  defaultMessage: 'Enter a name for this snippet',
                }
              )}
              fullWidth
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('console.snippets.saveSnippetModal.descriptionLabel', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-test-subj="consoleSnippetDescriptionInput"
              placeholder={i18n.translate(
                'console.snippets.saveSnippetModal.descriptionPlaceholder',
                {
                  defaultMessage: 'Add an optional description',
                }
              )}
              fullWidth
              rows={3}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="consoleSnippetCancelButton">
          <FormattedMessage
            id="console.snippets.saveSnippetModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleSave}
          disabled={!title.trim() || saveSnippet.isLoading}
          isLoading={saveSnippet.isLoading}
          data-test-subj="consoleSnippetSaveButton"
        >
          <FormattedMessage
            id="console.snippets.saveSnippetModal.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
